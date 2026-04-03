/**
 * Demo Data Seeder
 * Writes simulated vital signs to Firebase so both Patient and Admin dashboards
 * display the same synchronized data. Called from the patient dashboard.
 */
import { ref, push, set, get, update } from 'firebase/database';
import { db } from './firebase';

let seederInterval: ReturnType<typeof setInterval> | null = null;
let lastBpm = 72;

/**
 * Starts writing simulated ECG data to Firebase for the given patient.
 * This ensures the admin panel (ECG Monitor, Patients, Overview) all see
 * the same live data the patient sees.
 */
export function startDemoDataSeeder(userId: string) {
  if (seederInterval) return; // Already running

  // Write an initial reading immediately
  writeDemoReading(userId);

  // Then write every 3 seconds
  seederInterval = setInterval(() => {
    writeDemoReading(userId);
  }, 3000);
}

export function stopDemoDataSeeder() {
  if (seederInterval) {
    clearInterval(seederInterval);
    seederInterval = null;
  }
}

let targetBpm = 72;

function writeDemoReading(userId: string) {
  // Occasionally set a new target BPM for larger fluctuations (normal range 60-100, occasional spikes to 130)
  if (Math.random() < 0.1) {
    targetBpm = Math.random() > 0.95 ? 130 : 60 + Math.random() * 40;
  }

  // Move gradually towards target
  let delta = (targetBpm - lastBpm) * 0.2;
  // Add some random noise
  delta += (Math.random() - 0.5) * 4;
  
  lastBpm = Math.max(50, Math.min(160, Math.round(lastBpm + delta)));

  const reading = {
    userId,
    bpm: lastBpm,
    voltage: +(0.8 + Math.random() * 0.4).toFixed(2),
    timestamp: Date.now(),
    isAnomaly: lastBpm > 100 || lastBpm < 55,
    motionData: {
      accelX: +(Math.random() * 0.5 - 0.25).toFixed(3),
      accelY: +(Math.random() * 0.3 - 0.15).toFixed(3),
      accelZ: +(9.8 + Math.random() * 0.2 - 0.1).toFixed(3),
    },
    rrIntervals: Array.from({ length: 5 }, () =>
      Math.round(800 + (Math.random() - 0.5) * 200)
    ),
  };

  push(ref(db, 'ecg_readings'), reading).catch(() => {});
}

/**
 * Creates a support alert visible in the Admin Alerts page.
 */
export async function createSupportAlert(userId: string, type: string = 'support_request') {
  try {
    const alertRef = push(ref(db, 'alerts'));
    await set(alertRef, {
      userId,
      type,
      status: 'active',
      createdAt: Date.now(),
      timeline: [
        { step: 'Alert triggered', completed: true, timestamp: Date.now() },
        { step: 'Admin notified', completed: false },
        { step: 'Response initiated', completed: false },
        { step: 'Resolved', completed: false },
      ],
    });
    return alertRef.key;
  } catch (err) {
    console.error('Failed to create alert:', err);
    return null;
  }
}

/**
 * Creates an emergency SOS alert (higher severity).
 */
export async function createEmergencyAlert(userId: string) {
  try {
    const alertRef = push(ref(db, 'alerts'));
    await set(alertRef, {
      userId,
      type: 'cardiac',
      status: 'active',
      createdAt: Date.now(),
      timeline: [
        { step: 'Emergency SOS triggered', completed: true, timestamp: Date.now() },
        { step: 'Admin notified', completed: true, timestamp: Date.now() },
        { step: 'Emergency services contacted', completed: false },
        { step: 'Patient stabilized', completed: false },
        { step: 'Resolved', completed: false },
      ],
    });

    // Also mark needsSupport
    await update(ref(db, `users/${userId}`), { needsSupport: true });

    return alertRef.key;
  } catch (err) {
    console.error('Failed to create emergency alert:', err);
    return null;
  }
}

/**
 * Seeds initial demo vital data into the user's Firebase node
 * so admin Patients page shows vitals immediately.
 */
export async function seedDemoVitals(userId: string) {
  try {
    await update(ref(db, `users/${userId}`), {
      mode: 'normal',
      lastVitals: {
        spO2: 98,
        hrv: 42,
        stress: 24,
        bodyTemp: 98.4,
        respRate: 16,
        bloodPressureSys: 118,
        bloodPressureDia: 76,
        // Guardian Pulse medical diagnostics
        heartRhythm: 92,
        tremorScore: 8,
        seizureRisk: 5,
        gaitStability: 88,
        panicScore: 12,
        updatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error('Failed to seed demo vitals:', err);
  }
}

/**
 * Updates the user's lastVitals in Firebase so admin can see them.
 */
export async function syncVitalsToFirebase(userId: string, vitals: Record<string, number>) {
  try {
    await update(ref(db, `users/${userId}/lastVitals`), {
      ...vitals,
      updatedAt: Date.now(),
    });
  } catch {
    // Silent fail — vitals sync is best-effort
  }
}
