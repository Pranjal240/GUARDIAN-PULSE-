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

// ─── Admin Request Interface ─────────────────────────
export interface AdminRequest {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
}

// ─── Audit Log Interface ─────────────────────────────
export interface AuditLogEntry {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  targetUserId?: string;
  targetUserName?: string;
  details: string;
  timestamp: number;
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
          const computedName = val.name 
            || `${val.firstName || ''} ${val.lastName || ''}`.trim() 
            || 'Unknown';
          patients.push({ 
            ...val,
            userId: child.key || val.userId || '', 
            name: computedName,
            email: (val.email || '').toLowerCase().trim(),
          });
        });

        // ── Deduplicate by email ──────────────────────────────────────
        // If multiple Firebase nodes share the same email (e.g., leftover
        // test entries), keep only the most "complete" one: the one with
        // the most non-null fields, breaking ties by createdAt (newest).
        const emailMap = new Map<string, Patient>();
        for (const p of patients) {
          if (!p.userId) continue;
          const email = (p.email || '').toLowerCase().trim();
          
          if (!email) {
            // No email — keep under a synthetic key to avoid collision
            emailMap.set(`no-email-${p.userId}`, p);
            continue;
          }

          const existing = emailMap.get(email);
          if (!existing) {
            emailMap.set(email, p);
          } else {
            // Score = number of truthy fields (more data = better record)
            const score = (x: Patient) => Object.values(x).filter(Boolean).length;
            const existingCreated = (existing as Record<string, unknown>).createdAt as number || 0;
            const newCreated = (p as Record<string, unknown>).createdAt as number || 0;

            if (score(p) > score(existing) || (score(p) === score(existing) && newCreated > existingCreated)) {
              emailMap.set(email, p);
            }
          }
        }

        setData(Array.from(emailMap.values()));
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

// ─── Admin Request Hooks ─────────────────────────────

export function useAdminRequests() {
  const [data, setData] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onValue(
      ref(db, "admin_requests"),
      (snapshot) => {
        const requests: AdminRequest[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          requests.push({
            userId: child.key || '',
            ...val,
          });
        });
        // Sort newest first
        requests.sort((a, b) => b.requestedAt - a.requestedAt);
        setData(requests);
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

export function usePendingAdminCount() {
  const { data: requests } = useAdminRequests();
  return requests.filter(r => r.status === 'pending').length;
}

export function useUserRole(userId: string) {
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onValue(
      ref(db, `users/${userId}/role`),
      (snapshot) => {
        setRole(snapshot.val() || '');
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [userId]);

  return { role, loading };
}

// ─── Audit Log Hook ──────────────────────────────────

export function useAuditLog(limitCount = 50) {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      ref(db, "audit_log"),
      limitToLast(limitCount),
    );
    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const entries: AuditLogEntry[] = [];
        snapshot.forEach((child) => {
          entries.push({ id: child.key || '', ...child.val() });
        });
        entries.sort((a, b) => b.timestamp - a.timestamp);
        setData(entries);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [limitCount]);

  return { data, loading };
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
  const bpmDeviation = Math.min(Math.abs(bpm - 70) / 70, 1) * 40;
  const hrvDeficit = Math.min(Math.max((60 - hrv) / 60, 0), 1) * 40;
  const tremor = Math.min(tremorIntensity / 100, 1) * 20;
  return Math.round(bpmDeviation + hrvDeficit + tremor);
}

export function detectTremorFromMotion(
  motionData: { accelX: number; accelY: number; accelZ: number }[],
) {
  let zeroCrossings = 0;
  let lastSign = 0;

  motionData.forEach((m) => {
    const sign = Math.sign(m.accelX);
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) zeroCrossings++;
    if (sign !== 0) lastSign = sign;
  });

  const frequency = zeroCrossings / 2;
  let type = "none";
  if (frequency >= 4 && frequency <= 6) type = "parkinson";
  else if (frequency >= 8 && frequency <= 12) type = "anxiety";

  return { detected: type !== "none", frequency, type };
}

export function classifyAlertType(alertType: string = 'unknown') {
  switch ((alertType || 'unknown').toLowerCase()) {
    case "cardiac":
      return { color: "#E05252", icon: "Activity", label: "Cardiac Issue" };
    case "seizure":
      return { color: "#D4943A", icon: "Zap", label: "Seizure Detected" };
    case "panic":
      return {
        color: "#E8C438",
        icon: "AlertTriangle",
        label: "Panic Attack",
      };
    case "parkinson":
      return {
        color: "#5B9BD5",
        icon: "Activity",
        label: "Tremor Detected",
      };
    case "ptsd":
      return { color: "#9B7EC8", icon: "Brain", label: "PTSD Episode" };
    case "support_request":
      return { color: "#D4B896", icon: "LifeBuoy", label: "Support Request" };
    case "emergency_sos":
      return { color: "#E05252", icon: "Phone", label: "Emergency SOS" };
    default:
      return { color: "#E05252", icon: "AlertCircle", label: alertType || "Unknown Alert" };
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

// ─── Read synced demo vitals for admin view ──────────
export interface DemoVitals {
  spO2: number
  hrv: number
  stress: number
  bodyTemp: number
  respRate: number
  sleepScore?: number
  bloodPressureSys: number
  bloodPressureDia: number
  steps?: number
  calories?: number
  heartRhythm?: number
  tremorScore?: number
  seizureRisk?: number
  gaitStability?: number
  panicScore?: number
  updatedAt: number
}

export function usePatientDemoVitals(userId: string) {
  const [vitals, setVitals] = useState<DemoVitals | null>(null)

  useEffect(() => {
    if (!userId) return
    const vitalsRef = ref(db, `users/${userId}/lastVitals`)
    const unsub = onValue(vitalsRef, (snap) => {
      if (snap.exists()) {
        setVitals(snap.val() as DemoVitals)
      }
    })
    return () => unsub()
  }, [userId])

  return vitals
}

// ─── Count-based hooks for dashboard stats ───────────
export function useSupportRequestCount() {
  const { data: patients } = useAllPatients()
  return patients.filter(p => p.needsSupport).length
}
