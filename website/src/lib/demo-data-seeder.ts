/**
 * Demo Data Seeder
 * Writes simulated vital signs to Firebase so both Patient and Admin dashboards
 * display the same synchronized data. Called from the patient dashboard.
 *
 * Key design decisions:
 * - Per-patient state: each logged-in patient gets their own baseline + drift state
 * - BPM changes every 3s with ±1-2 drift (realistic heart rate)
 * - Target BPM shifts every ~45-60s (slow trends, not chaotic jumps)
 * - Patient-specific baselines seeded from a hash of their userId
 */
import { ref, push, update } from 'firebase/database';
import { db } from './firebase';

// ─── Per-patient state tracking ──────────────────────
interface PatientDemoState {
  lastBpm: number;
  targetBpm: number;
  targetShiftCounter: number;  // counts ticks until next target shift
  baselineVitals: PatientBaseline;
}

interface PatientBaseline {
  spO2: number;
  hrv: number;
  stress: number;
  bodyTemp: number;
  respRate: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  heartRhythm: number;
  tremorScore: number;
  seizureRisk: number;
  gaitStability: number;
  panicScore: number;
}

const patientStates = new Map<string, PatientDemoState>();
let seederInterval: ReturnType<typeof setInterval> | null = null;
let currentSeederUserId: string | null = null;

// ─── Deterministic hash from userId ──────────────────
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generates a unique baseline for each patient based on their userId.
 * Different patients will get different but always-stable starting values.
 */
export function generatePatientBaseline(userId: string): PatientBaseline {
  const h = simpleHash(userId);
  // Use different bits of the hash for each vital
  return {
    spO2:             96 + (h % 4),                           // 96–99
    hrv:              36 + ((h >> 3) % 20),                   // 36–55
    stress:           18 + ((h >> 6) % 22),                   // 18–39
    bodyTemp:         +(97.8 + ((h >> 9) % 12) * 0.1).toFixed(1) as unknown as number, // 97.8–99.0
    respRate:         14 + ((h >> 12) % 5),                   // 14–18
    bloodPressureSys: 112 + ((h >> 15) % 16),                 // 112–127
    bloodPressureDia: 70 + ((h >> 18) % 12),                  // 70–81
    heartRhythm:      85 + ((h >> 21) % 12),                  // 85–96
    tremorScore:      4 + ((h >> 24) % 10),                   // 4–13
    seizureRisk:      3 + ((h >> 27) % 8),                    // 3–10
    gaitStability:    82 + ((h >> 4) % 14),                   // 82–95
    panicScore:       8 + ((h >> 7) % 16),                    // 8–23
  };
}

function getOrCreateState(userId: string): PatientDemoState {
  let state = patientStates.get(userId);
  if (!state) {
    const baseline = generatePatientBaseline(userId);
    const h = simpleHash(userId);
    const startBpm = 68 + (h % 12); // 68–79 — resting range
    state = {
      lastBpm: startBpm,
      targetBpm: startBpm,
      targetShiftCounter: 15 + (h % 6), // first shift after 15-20 ticks (~45-60s)
      baselineVitals: baseline,
    };
    patientStates.set(userId, state);
  }
  return state;
}

/**
 * Starts writing simulated ECG data to Firebase for the given patient.
 * This ensures the admin panel (ECG Monitor, Patients, Overview) all see
 * the same live data the patient sees.
 */
export function startDemoDataSeeder(userId: string) {
  // If already running for a different user, stop the old one first
  if (seederInterval && currentSeederUserId !== userId) {
    stopDemoDataSeeder();
  }
  if (seederInterval) return; // Already running for this user

  currentSeederUserId = userId;

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
    currentSeederUserId = null;
  }
}

function writeDemoReading(userId: string) {
  // Check if monitoring is disabled by admin before writing
  import('firebase/database').then(({ get: fbGet }) => {
    fbGet(ref(db, `users/${userId}/monitorDisabled`)).then((snap) => {
      if (snap.exists() && snap.val() === true) {
        // Monitor is disabled — don't write any ECG data
        return;
      }
      _doWriteDemoReading(userId);
    }).catch(() => {
      // On error, still write (fail-open for data seeding)
      _doWriteDemoReading(userId);
    });
  });
}

function _doWriteDemoReading(userId: string) {
  const state = getOrCreateState(userId);

  // Decrement target shift counter
  state.targetShiftCounter--;
  if (state.targetShiftCounter <= 0) {
    // Shift target BPM by a small amount (±3-8 BPM)
    const shift = (Math.random() - 0.5) * 10; // ±5
    const h = simpleHash(userId);
    const baseBpm = 68 + (h % 12);
    state.targetBpm = Math.max(60, Math.min(90, baseBpm + shift));
    // Next shift in 15-20 ticks (45-60 seconds at 3s interval)
    state.targetShiftCounter = 15 + Math.floor(Math.random() * 6);
  }

  // Move towards target with small drift (±1-2 BPM per tick)
  let delta = (state.targetBpm - state.lastBpm) * 0.15;
  // Add tiny noise (±1)
  delta += (Math.random() - 0.5) * 2;

  state.lastBpm = Math.max(55, Math.min(100, Math.round(state.lastBpm + delta)));

  const reading = {
    userId,
    bpm: state.lastBpm,
    voltage: +(0.8 + Math.random() * 0.4).toFixed(2),
    timestamp: Date.now(),
    isAnomaly: state.lastBpm > 100 || state.lastBpm < 55,
    motionData: {
      accelX: +(Math.random() * 0.5 - 0.25).toFixed(3),
      accelY: +(Math.random() * 0.3 - 0.15).toFixed(3),
      accelZ: +(9.8 + Math.random() * 0.2 - 0.1).toFixed(3),
    },
    rrIntervals: Array.from({ length: 5 }, () =>
      Math.round(800 + (Math.random() - 0.5) * 100) // tighter variance
    ),
  };

  push(ref(db, 'ecg_readings'), reading).catch(() => {});
}

/**
 * Creates a support alert visible in the Admin Alerts page.
 */
export async function createSupportAlert(userId: string, type: string = 'support_request') {
  try {
    const { set } = await import('firebase/database');
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
    const { set } = await import('firebase/database');
    const alertRef = push(ref(db, 'alerts'));
    await set(alertRef, {
      userId,
      type: 'emergency_sos',
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
 * Also syncs the user's profile (name, email) from Clerk to Firebase
 * to fix "Unknown" name issues.
 */
export async function seedDemoVitals(
  userId: string,
  profile?: { name?: string; email?: string; avatarUrl?: string }
) {
  try {
    const baseline = generatePatientBaseline(userId);

    const profileData: Record<string, unknown> = {
      mode: 'normal',
      lastActive: Date.now(),
      emergencyContact: '112',
      lastVitals: {
        ...baseline,
        updatedAt: Date.now(),
      },
    };

    // NEVER set role here — roles are managed exclusively
    // by the auth flow in page.tsx (root). Setting role here
    // was causing new users to sometimes get incorrect roles.

    // Only write profile fields if they're non-empty
    if (profile?.name) profileData.name = profile.name;
    if (profile?.email) profileData.email = profile.email;
    if (profile?.avatarUrl) profileData.avatarUrl = profile.avatarUrl;

    await update(ref(db, `users/${userId}`), profileData);
  } catch (err) {
    console.error('Failed to seed demo vitals:', err);
  }
}

/**
 * Updates the user's lastVitals in Firebase so admin can see them.
 */
export async function syncVitalsToFirebase(userId: string, vitals: Record<string, number>) {
  try {
    // Check if monitoring is disabled
    const { get: fbGet } = await import('firebase/database');
    const monitorSnap = await fbGet(ref(db, `users/${userId}/monitorDisabled`));
    const isDisabled = monitorSnap.exists() && monitorSnap.val() === true;

    // Update lastActive regardless
    await update(ref(db, `users/${userId}`), {
      lastActive: Date.now(),
    });

    if (isDisabled) {
      // Write zeroed vitals when monitor is disabled
      const zeroedVitals: Record<string, number> = {};
      for (const key of Object.keys(vitals)) {
        zeroedVitals[key] = 0;
      }
      await update(ref(db, `users/${userId}/lastVitals`), {
        ...zeroedVitals,
        updatedAt: Date.now(),
      });
    } else {
      await update(ref(db, `users/${userId}/lastVitals`), {
        ...vitals,
        updatedAt: Date.now(),
      });
    }
  } catch {
    // Silent fail — vitals sync is best-effort
  }
}

/**
 * One-time migration: convert old 'cardiac' alerts that were actually
 * manual SOS triggers into the correct 'emergency_sos' type.
 * Detects SOS alerts by checking timeline for "Emergency SOS" text.
 */
let _migrationRan = false;
export async function migrateCardiacToSOS() {
  if (_migrationRan) return; // Only run once per session
  _migrationRan = true;

  try {
    const { get } = await import('firebase/database');
    const alertsSnap = await get(ref(db, 'alerts'));
    if (!alertsSnap.exists()) return;

    const updates: Record<string, string> = {};
    alertsSnap.forEach((child) => {
      const val = child.val();
      if (val.type === 'cardiac' && val.timeline) {
        // Check if timeline mentions "Emergency SOS"
        const isSOSAlert = val.timeline.some(
          (t: { step?: string }) => t.step && t.step.toLowerCase().includes('emergency sos')
        );
        if (isSOSAlert) {
          updates[`alerts/${child.key}/type`] = 'emergency_sos';
        }
      }
    });

    // Apply all updates in one batch
    const numUpdates = Object.keys(updates).length;
    if (numUpdates > 0) {
      const { set } = await import('firebase/database');
      for (const [path, value] of Object.entries(updates)) {
        await set(ref(db, path), value);
      }
      console.log(`[Migration] Converted ${numUpdates} cardiac alerts → emergency_sos`);
    }
  } catch (err) {
    console.error('[Migration] Failed to migrate alerts:', err);
  }
}
