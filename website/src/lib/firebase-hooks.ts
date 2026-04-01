import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  get,
  off,
} from "firebase/database";
import { db } from "./firebase";

// UserProfile interface removed in favor of Patient

// ─── Patient Interface ───────────────────────────────
export interface Patient {
  userId?: string
  name?: string
  phone?: string
  email?: string
  role?: string
  mode?: string
  emergencyContact1Name?: string
  emergencyContact1Phone?: string
  emergencyContact1Email?: string
  createdAt?: string
  fcmToken?: string
  needsSupport?: boolean
  avatarUrl?: string
}

export interface EcgReading {
  id: string;
  userId: string;
  timestamp: number;
  bpm: number;
  voltage: number;
  motionData?: { accelX: number; accelY: number; accelZ: number };
  rrIntervals?: number[];
  isAnomaly?: boolean;
}

export interface Alert {
  id: string;
  userId: string;
  type: string;
  status: string;
  createdAt: number;
  timeline?: { step: string; completed: boolean; timestamp?: number }[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: "patient" | "system" | "support" | "ai";
  text: string;
  timestamp: number;
}

export interface SystemStats {
  totalPatients: number;
  activeAlerts: number;
  avgBpm: number;
  criticalToday: number;
}

// ----------------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------------

export function useAllPatients() {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(ref(db, "users"), orderByChild("role"), equalTo("patient"));
    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const patients: Patient[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          patients.push({ 
            userId: child.key || val.userId || '', 
            name: val.name || `${val.firstName || ''} ${val.lastName || ''}`.trim() || 'Unknown',
            ...val 
          });
        });
        setData(patients.filter(p => p.userId !== undefined));
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}

export function usePatientECG(userId: string, limitCount = 60) {
  const [data, setData] = useState<EcgReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      ref(db, "ecg_readings"),
      orderByChild("userId"),
      equalTo(userId),
      limitToLast(limitCount),
    );
    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const readings: EcgReading[] = [];
        snapshot.forEach((child) => {
          readings.push({ id: child.key, ...child.val() });
        });
        // Sort by timestamp
        readings.sort((a, b) => a.timestamp - b.timestamp);
        setData(readings);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [userId, limitCount]);

  return { data, loading, error };
}

export function useLatestECGPerPatient(patientIds: string[]) {
  const [data, setData] = useState<Map<string, EcgReading[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!patientIds || patientIds.length === 0) {
      setLoading(false);
      return;
    }

    // We create multiple listeners for the selected patients
    const map = new Map<string, EcgReading[]>();
    const callbacks: (() => void)[] = [];

    patientIds.forEach((id) => {
      const q = query(
        ref(db, "ecg_readings"),
        orderByChild("userId"),
        equalTo(id),
        limitToLast(30),
      );
      const unsubscribe = onValue(
        q,
        (snapshot) => {
          const readings: EcgReading[] = [];
          snapshot.forEach((child) => {
            readings.push({ id: child.key, ...child.val() });
          });
          readings.sort((a, b) => a.timestamp - b.timestamp);
          map.set(id, readings);
          // Force update Map instance
          setData(new Map(map));
        },
        (err) => {
          setError(err);
        },
      );
      callbacks.push(() => unsubscribe());
    });

    setLoading(false);
    return () => {
      callbacks.forEach((cb) => cb());
    };
  }, [patientIds.join(",")]);

  return { data, loading, error };
}

export function useActiveAlerts() {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, "alerts"),
      (snapshot) => {
        const alerts: Alert[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          if (val.status !== "resolved") {
            alerts.push({ id: child.key, ...val });
          }
        });
        alerts.sort((a, b) => b.createdAt - a.createdAt);
        setData(alerts);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}

export function useAllAlerts(days = 30) {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
    const unsubscribe = onValue(
      ref(db, "alerts"),
      (snapshot) => {
        const alerts: Alert[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          if (val.createdAt >= cutoffDate) {
            alerts.push({ id: child.key, ...val });
          }
        });
        alerts.sort((a, b) => b.createdAt - a.createdAt);
        setData(alerts);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [days]);

  return { data, loading, error };
}

export function useChatMessages(userId: string) {
  const [data, setData] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      ref(db, "chat_messages"),
      orderByChild("userId"),
      equalTo(userId),
    );
    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((child) => {
          msgs.push({ id: child.key, ...child.val() });
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setData(msgs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [userId]);

  return { data, loading, error };
}

export function useUserProfile(userId: string) {
  const [data, setData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onValue(
      ref(db, "users/" + userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setData({ 
            userId: snapshot.key || val.userId || '',
            name: val.name || `${val.firstName || ''} ${val.lastName || ''}`.trim() || 'Unknown',
            ...val 
          });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [userId]);

  return { data, loading, error };
}

export function useSystemStats() {
  const { data: patients } = useAllPatients();
  const { data: activeAlerts } = useActiveAlerts();

  // Minimal stats calculation derived from patients & alerts (using mock logic for avgBpm/criticalToday as placeholder without fetching massive ecg db payload entirely)
  const totalPatients = patients.length;
  const numActiveAlerts = activeAlerts.length;
  const criticalToday = activeAlerts.filter(
    (a) => a.createdAt > Date.now() - 86400000 && a.type === "cardiac",
  ).length;

  return {
    data: {
      totalPatients,
      activeAlerts: numActiveAlerts,
      avgBpm: 72,
      criticalToday,
    },
    loading: false,
    error: null,
  };
}

// ----------------------------------------------------------------------------
// Computed Vitals & Helpers
// ----------------------------------------------------------------------------

export function calculateBpmStatus(
  bpm: number,
): "normal" | "warning" | "critical" {
  if (bpm < 50 || bpm > 130) return "critical";
  if ((bpm >= 50 && bpm < 60) || (bpm > 100 && bpm <= 130)) return "warning";
  return "normal";
}

export function calculateHRV(rrIntervals?: number[]): number {
  if (!rrIntervals || rrIntervals.length < 2) return 0;
  let sumSq = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (rrIntervals.length - 1));
}

export function calculateStressLevel(
  bpm: number,
  hrv: number,
  tremorIntensity: number = 0,
): number {
  const bpmDeviation = Math.min(Math.abs(bpm - 70) / 70, 1) * 40; // up to 40%
  const hrvDeficit = Math.min(Math.max((60 - hrv) / 60, 0), 1) * 40; // up to 40%
  const tremor = Math.min(tremorIntensity / 100, 1) * 20; // up to 20%
  return Math.round(bpmDeviation + hrvDeficit + tremor);
}

export function detectTremorFromMotion(
  motionData: { accelX: number; accelY: number; accelZ: number }[],
) {
  // Simplified zero-crossing approximation logic
  let zeroCrossings = 0;
  let lastSign = 0;

  motionData.forEach((m) => {
    const sign = Math.sign(m.accelX);
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) zeroCrossings++;
    if (sign !== 0) lastSign = sign;
  });

  // Convert zero-crossings to rough frequency hz (assuming 1 sec window for ease)
  const frequency = zeroCrossings / 2;
  let type = "none";
  if (frequency >= 4 && frequency <= 6) type = "parkinson";
  else if (frequency >= 8 && frequency <= 12) type = "anxiety";

  return { detected: type !== "none", frequency, type };
}

export function classifyAlertType(alertType: string = 'unknown') {
  switch ((alertType || 'unknown').toLowerCase()) {
    case "cardiac":
      return { color: "var(--red)", icon: "Activity", label: "Cardiac Issue" };
    case "seizure":
      return { color: "#D4943A", icon: "Zap", label: "Seizure Detected" }; // Orange/amber
    case "panic":
      return {
        color: "var(--amber)",
        icon: "AlertTriangle",
        label: "Panic Attack",
      };
    case "parkinson":
      return {
        color: "var(--blue)",
        icon: "Activity",
        label: "Tremor Detected",
      };
    case "ptsd":
      return { color: "var(--purple)", icon: "Brain", label: "PTSD Episode" };
    default:
      return { color: "var(--red)", icon: "AlertCircle", label: alertType };
  }
}
// ─── useLiveVitals Hook ──────────────────────────────
export function useLiveVitals(userId: string) {
  const [vitals, setVitals] = useState<{
    bpm: number
    stress: number
    tremor: boolean
    tremorFrequency: number
    mode: string
    connected: boolean
    lastUpdated: number
  }>({
    bpm: 0,
    stress: 0,
    tremor: false,
    tremorFrequency: 0,
    mode: 'normal',
    connected: false,
    lastUpdated: 0,
  })

  useEffect(() => {
    if (!userId) return

    // Watch latest ECG reading
    const ecgRef = query(
      ref(db, 'ecg_readings'),
      orderByChild('userId'),
      equalTo(userId),
      limitToLast(1)
    )
    const unsubEcg = onValue(ecgRef, (snap) => {
      if (!snap.val()) return
      const vals = Object.values(snap.val() as Record<string, any>)
      const latest = vals[vals.length - 1] as any
      const lastUpdated = latest?.timestamp
        ? new Date(latest.timestamp).getTime()
        : 0
      const connected = Date.now() - lastUpdated < 30000
      setVitals((prev) => ({
        ...prev,
        bpm: latest?.bpm ?? 0,
        stress: latest?.stressLevel ?? 0,
        connected,
        lastUpdated,
      }))
    })

    // Watch latest motion data
    const motionRef = query(
      ref(db, 'motion_data'),
      orderByChild('userId'),
      equalTo(userId),
      limitToLast(1)
    )
    const unsubMotion = onValue(motionRef, (snap) => {
      if (!snap.val()) return
      const vals = Object.values(snap.val() as Record<string, any>)
      const latest = vals[vals.length - 1] as any
      setVitals((prev) => ({
        ...prev,
        tremor: latest?.tremorDetected ?? false,
        tremorFrequency: latest?.tremorFrequency ?? 0,
        stress: latest?.stressLevel ?? prev.stress,
      }))
    })

    // Watch user profile for mode
    const userRef = ref(db, `users/${userId}`)
    const unsubUser = onValue(userRef, (snap) => {
      if (snap.val()) {
        setVitals((prev) => ({
          ...prev,
          mode: snap.val()?.mode ?? 'normal',
        }))
      }
    })

    return () => {
      unsubEcg()
      unsubMotion()
      unsubUser()
    }
  }, [userId])

  return vitals
}
