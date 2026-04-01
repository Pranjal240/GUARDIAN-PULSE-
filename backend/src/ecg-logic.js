/**
 * ecg-logic.js — Guardian Pulse
 * Medical anomaly detection engine
 * Covers: BPM analysis, seizure detection, Parkinson's tremor, HRV, stress analysis
 */

// ─── BPM Thresholds ───────────────────────────────────────────────────────────
const BPM_THRESHOLDS = {
  critical_high: 180,  // Extreme tachycardia
  warning_high: 130,   // Tachycardia
  normal_high: 100,
  normal_low: 60,
  warning_low: 50,     // Bradycardia
  critical_low: 40,    // Extreme bradycardia
};

// Mode-specific thresholds
const MODE_THRESHOLDS = {
  normal: { high: 130, low: 50 },
  sleep: { high: 150, low: 40 },       // Wider — sleep often has low BPM
  parkinson: { high: 120, low: 55 },   // Tighter — Parkinson patients need closer watch
};

/**
 * Main anomaly detection function.
 * Called by the Cloudflare Worker on every sensor data packet.
 *
 * @param {Array} ecgReadings - Array of {bpm, rawValue, timestamp}
 * @param {Array} motionReadings - Array of {accelX, accelY, accelZ, gyroX, gyroY, gyroZ, timestamp}
 * @param {string} mode - 'normal' | 'sleep' | 'parkinson'
 * @param {number} baselineBpm - User's established baseline BPM (from profile history)
 * @returns {Object} Full anomaly report
 */
export function detectAnomalies(ecgReadings, motionReadings, mode = 'normal', baselineBpm = 75) {
  const latest = ecgReadings[ecgReadings.length - 1];
  const bpm = latest?.bpm || 0;
  const thresholds = MODE_THRESHOLDS[mode] || MODE_THRESHOLDS.normal;

  const rrIntervals = calculateRRIntervals(ecgReadings);
  const hrv = calculateHRV(rrIntervals);
  const seizure = detectSeizure(ecgReadings, motionReadings);
  const tremor = detectTremor(motionReadings);
  const stressData = calculateStress(bpm, hrv, tremor.intensity, baselineBpm);

  // BPM-based classification
  let bpmStatus = 'normal';
  let bpmAlertType = null;
  if (bpm >= BPM_THRESHOLDS.critical_high) {
    bpmStatus = 'critical';
    bpmAlertType = 'cardiac';
  } else if (bpm >= thresholds.high) {
    bpmStatus = 'warning';
    bpmAlertType = 'cardiac';
  } else if (bpm <= BPM_THRESHOLDS.critical_low) {
    bpmStatus = 'critical';
    bpmAlertType = 'cardiac';
  } else if (bpm <= thresholds.low) {
    bpmStatus = 'warning';
    bpmAlertType = 'cardiac';
  }

  // Determine the most critical anomaly to surface
  const isAnomaly = bpmStatus !== 'normal' || seizure.detected || tremor.detected;
  let primaryAlertType = null;
  let severity = 'low';

  if (seizure.detected) {
    primaryAlertType = 'seizure';
    severity = 'critical';
  } else if (bpmStatus === 'critical') {
    primaryAlertType = 'cardiac';
    severity = 'critical';
  } else if (tremor.detected && mode === 'parkinson') {
    primaryAlertType = 'parkinson_tremor';
    severity = 'medium';
  } else if (bpmStatus === 'warning' || stressData.level > 75) {
    primaryAlertType = bpmAlertType || 'stress';
    severity = stressData.level > 85 ? 'high' : 'medium';
  }

  return {
    isAnomaly,
    primaryAlertType,
    severity,
    bpm,
    bpmStatus,
    hrv: Math.round(hrv),
    seizure,
    tremor,
    stress: stressData,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Seizure detection using combined ECG + motion thresholds.
 * A seizure typically shows:
 *  - Sudden BPM jump ≥ 30 from previous reading
 *  - Rapid jerk in accelerometer (>2g or >3g depending on axis)
 *  - High ECG signal standard deviation
 */
export function detectSeizure(ecgReadings, motionReadings) {
  if (ecgReadings.length < 5 || motionReadings.length < 5) {
    return { detected: false, confidence: 0 };
  }

  // Check for sudden BPM jump
  const bpms = ecgReadings.map(r => r.bpm).filter(Boolean);
  let bpmJump = false;
  for (let i = 1; i < bpms.length; i++) {
    if (Math.abs(bpms[i] - bpms[i - 1]) >= 30) {
      bpmJump = true;
      break;
    }
  }

  // ECG signal standard deviation (high SD = chaotic rhythm)
  const rawValues = ecgReadings.map(r => r.rawValue).filter(v => v != null);
  const ecgSD = stdDev(rawValues);
  const highEcgSD = ecgSD > 400;

  // Accelerometer jerk detection
  const motionJerks = motionReadings.map(r => {
    const magnitude = Math.sqrt(r.accelX ** 2 + r.accelY ** 2 + r.accelZ ** 2);
    return magnitude;
  });
  const maxJerk = Math.max(...motionJerks);
  const hasJerk = maxJerk > 2.5; // > 2.5g = strong jerk

  // Score-based confidence
  let score = 0;
  if (bpmJump) score += 2;
  if (highEcgSD) score += 2;
  if (hasJerk) score += 3;
  if (bpmJump && hasJerk) score += 2; // Both together = strong indicator

  return {
    detected: score >= 5,
    confidence: Math.min(Math.round((score / 9) * 100), 100),
    indicators: { bpmJump, highEcgSD, hasJerk, maxJerk: Math.round(maxJerk * 100) / 100 },
  };
}

/**
 * Parkinson's tremor detection using gyroscope FFT analysis.
 * Parkinson's tremor characteristic frequency: 4-6 Hz (resting tremor)
 * Essential tremor: 8-12 Hz (action tremor) — not Parkinson's
 */
export function detectTremor(motionReadings) {
  if (motionReadings.length < 20) {
    return { detected: false, frequency: 0, intensity: 0, type: null };
  }

  // Use gyroscope Z-axis for tremor detection
  const samples = motionReadings.map(r => r.gyroZ || 0);
  const sampleRate = 50; // Hz — Pi samples at 50 Hz

  // Zero-crossing frequency estimation (simpler than full FFT)
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) crossings++;
  }
  const duration = samples.length / sampleRate;
  const estimatedFreq = (crossings / 2) / duration;

  // Calculate tremor intensity (RMS of gyro signal)
  const rms = Math.sqrt(samples.reduce((sum, v) => sum + v ** 2, 0) / samples.length);
  const intensity = Math.min(Math.round(rms * 10), 100);

  // Classify tremor type by frequency
  let type = null;
  let detected = false;

  if (rms > 0.5) { // Significant tremor threshold
    if (estimatedFreq >= 4 && estimatedFreq <= 6) {
      type = 'parkinson';
      detected = true;
    } else if (estimatedFreq >= 8 && estimatedFreq <= 12) {
      type = 'essential';
      detected = true;
    } else if (estimatedFreq >= 3 && estimatedFreq <= 8) {
      type = 'unknown';
      detected = intensity > 40;
    }
  }

  return {
    detected,
    frequency: Math.round(estimatedFreq * 10) / 10,
    intensity,
    type,
  };
}

/**
 * Calculate Heart Rate Variability (HRV) using RMSSD method.
 * Higher HRV = better heart health, lower stress.
 * Normal: 20-70ms. Low: < 20ms = stress/fatigue.
 */
export function calculateHRV(rrIntervals) {
  if (!rrIntervals || rrIntervals.length < 2) return 0;

  const diffs = [];
  for (let i = 1; i < rrIntervals.length; i++) {
    diffs.push((rrIntervals[i] - rrIntervals[i - 1]) ** 2);
  }
  return Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

/**
 * Calculate RR intervals (ms between heartbeats) from BPM readings.
 */
function calculateRRIntervals(ecgReadings) {
  return ecgReadings
    .filter(r => r.bpm > 0)
    .map(r => Math.round(60000 / r.bpm));
}

/**
 * Multi-factor stress score (0-100).
 * Formula: weighted average of BPM deviation, HRV deficit, and tremor presence.
 */
export function calculateStress(bpm, hrv, tremorIntensity = 0, baselineBpm = 75) {
  // BPM deviation from baseline (0-40 points)
  const bpmDev = Math.min(Math.abs(bpm - baselineBpm) * 1.5, 40);

  // HRV score (0-40 points) — low HRV = high stress
  // Normal HRV ~50ms → 0 stress; HRV 0 → 40 stress
  const hrvScore = Math.min(Math.max(40 - hrv * 0.8, 0), 40);

  // Tremor contribution (0-20 points)
  const tremorScore = Math.min(tremorIntensity * 0.2, 20);

  const total = Math.min(Math.round(bpmDev + hrvScore + tremorScore), 100);

  return {
    level: total,
    category: total < 30 ? 'low' : total < 60 ? 'moderate' : total < 80 ? 'high' : 'critical',
    factors: {
      bpmDeviation: Math.round(bpmDev),
      hrvDeficit: Math.round(hrvScore),
      tremorContrib: Math.round(tremorScore),
    },
  };
}

// ─── Internal Math Helpers ─────────────────────────────────────────────────────

function stdDev(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sq = arr.map(x => (x - mean) ** 2);
  return Math.sqrt(sq.reduce((a, b) => a + b, 0) / sq.length);
}
