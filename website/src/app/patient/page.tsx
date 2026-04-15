"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import {
  usePatientECG,
  calculateBpmStatus,
  useChatMessages,
  useMonitorStatus,
  markMessagesAsRead,
} from "@/lib/firebase-hooks";
import {
  startDemoDataSeeder,
  stopDemoDataSeeder,
  createSupportAlert,
  createEmergencyAlert,
  seedDemoVitals,
  syncVitalsToFirebase,
  generatePatientBaseline,
} from "@/lib/demo-data-seeder";
import LiveECGChart from "@/components/LiveECGChart";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Phone,
  LifeBuoy,
  Activity,
  Send,
  Wind,
  MessageSquare,
  Thermometer,
  Droplets,
  Brain,
  Zap,
  TrendingUp,
  Clock,
  Pill,
  ChevronUp,
  ChevronDown,
  Waves,
  Check,
  X,
  Shield,
  AlertTriangle,
  Gauge,
  PersonStanding,
  ImagePlus,
  ZoomIn,
  Settings,
  Save,
} from "lucide-react";
import { PowerOff } from "lucide-react";
import DiagnosticReportsList from "@/components/DiagnosticReportsList";
import ImageLightbox from "@/components/ImageLightbox";
import SOSCamera from "@/components/SOSCamera";
import { ref, update, push, onValue, get } from "firebase/database";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ─── Helpers ─────────────────────────────────────────
function fmtTime(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}
function fmtDate(d: Date) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
function fmtMsgTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

// ─── Animated ECG wave decoration ──
function ECGWaveBg({ color = "#4CAF78" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 600 100"
      className="w-full h-16 opacity-20"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0,50 L60,50 L80,50 L90,20 L100,80 L110,10 L120,90 L130,40 L140,50 L200,50 L260,50 L280,50 L290,20 L300,80 L310,10 L320,90 L330,40 L340,50 L400,50 L460,50 L480,50 L490,20 L500,80 L510,10 L520,90 L530,40 L540,50 L600,50"
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function PatientDashboard() {
  const { user } = useUser();
  const { data: ecgData, loading } = usePatientECG(user?.id || "", 60);
  const { data: chatMessages } = useChatMessages(user?.id || "");
  const { disabled: monitorDisabled } = useMonitorStatus(user?.id || "");

  const [time, setTime] = useState(new Date());
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const patientFileRef = useRef<HTMLInputElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [sosCameraActive, setSosCameraActive] = useState(false);
  const [activeSessionIdx, setActiveSessionIdx] = useState<number | null>(null); // null = show latest/new
  const [newChatMode, setNewChatMode] = useState(false); // true = show blank new chat

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneLoaded, setPhoneLoaded] = useState(false);

  // Interactive medication state
  const [medStatus, setMedStatus] = useState([true, false, false]);
  const [dismissedTips, setDismissedTips] = useState<number[]>([]);
  const [expandedVital, setExpandedVital] = useState<string | null>(null);

  // Simulated live vitals — initialized with patient-specific baseline
  const [vitalsInitialized, setVitalsInitialized] = useState(false);
  const [vitals, setVitals] = useState({
    spO2: 98,
    hrv: 42,
    stress: 24,
    bodyTemp: 98.4,
    respRate: 16,
    bloodPressureSys: 118,
    bloodPressureDia: 76,
    heartRhythm: 92,
    tremorScore: 8,
    seizureRisk: 5,
    gaitStability: 88,
    panicScore: 12,
  });

  // Set patient-specific baseline once user is available
  useEffect(() => {
    if (!user?.id || vitalsInitialized) return;
    const baseline = generatePatientBaseline(user.id);
    setVitals({
      spO2: baseline.spO2,
      hrv: baseline.hrv,
      stress: baseline.stress,
      bodyTemp: baseline.bodyTemp,
      respRate: baseline.respRate,
      bloodPressureSys: baseline.bloodPressureSys,
      bloodPressureDia: baseline.bloodPressureDia,
      heartRhythm: baseline.heartRhythm,
      tremorScore: baseline.tremorScore,
      seizureRisk: baseline.seizureRisk,
      gaitStability: baseline.gaitStability,
      panicScore: baseline.panicScore,
    });
    setVitalsInitialized(true);
  }, [user?.id, vitalsInitialized]);

  const medications = useMemo(
    () => [
      {
        name: "Metoprolol 25mg",
        time: "8:00 AM",
        color: "#4CAF78",
        dosage: "Heart rate control",
      },
      {
        name: "Lisinopril 10mg",
        time: "12:00 PM",
        color: "#D4943A",
        dosage: "Blood pressure",
      },
      {
        name: "Aspirin 81mg",
        time: "8:00 PM",
        color: "#5B9BD5",
        dosage: "Blood thinner",
      },
    ],
    [],
  );

  const healthTips = useMemo(
    () => [
      {
        tip: "Stay hydrated — drink at least 8 glasses of water today",
        icon: Droplets,
        color: "#5B9BD5",
      },
      {
        tip: "Keep your Guardian Pulse device charged above 20% for uninterrupted monitoring",
        icon: Shield,
        color: "#4CAF78",
      },
      {
        tip: "Practice deep breathing for 5 minutes to lower your panic score",
        icon: Wind,
        color: "#D4B896",
      },
      {
        tip: "Avoid sudden posture changes — your gait stability benefits from gradual movement",
        icon: Gauge,
        color: "#D4943A",
      },
    ],
    [],
  );

  // ─── START DEMO DATA SEEDER ───
  // Writes ECG readings to Firebase so Admin can see them
  useEffect(() => {
    if (!user?.id) return;

    // Don't seed data if monitoring is disabled
    if (monitorDisabled) {
      stopDemoDataSeeder();
      return;
    }

    // Start seeding demo ECG data to Firebase
    startDemoDataSeeder(user.id);

    // Seed initial vitals snapshot + profile info (fixes "Unknown" name)
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    seedDemoVitals(user.id, {
      name: fullName || undefined,
      email: user.primaryEmailAddress?.emailAddress || undefined,
      avatarUrl: user.imageUrl || undefined,
    });

    return () => {
      stopDemoDataSeeder();
    };
  }, [user?.id, user?.firstName, user?.lastName, monitorDisabled]);

  // ─── Sync vitals to Firebase periodically (every 5s) ───
  useEffect(() => {
    if (!user?.id) return;
    // Sync immediately on mount
    syncVitalsToFirebase(user.id, vitals);
    const syncInterval = setInterval(() => {
      syncVitalsToFirebase(user.id, vitals);
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [user?.id, vitals]);

  // ─── Clock update every second ───
  useEffect(() => {
    const clockTimer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // ─── Load phone number from Firebase ───
  useEffect(() => {
    if (!user?.id) return;
    const phoneRef = ref(db, `users/${user.id}/phone`);
    const unsub = onValue(phoneRef, (snap) => {
      if (snap.exists()) {
        setPhoneNumber(snap.val() || "");
      }
      setPhoneLoaded(true);
    });
    return () => unsub();
  }, [user?.id]);

  // ─── Save phone number to Firebase ───
  const handleSavePhone = useCallback(async () => {
    if (!user?.id) return;
    setPhoneSaving(true);
    try {
      await update(ref(db, `users/${user.id}`), { phone: phoneNumber.trim() });
      toast.success("Phone number saved successfully!", { icon: "📱" });
    } catch {
      toast.error("Failed to save phone number");
    } finally {
      setPhoneSaving(false);
    }
  }, [user?.id, phoneNumber]);

  // ─── SLOW vitals: SpO2, HRV, stress, body temp, resp rate, BP, diagnostics ───
  // Updates every 5 seconds with ±1 drift (realistic biological changes)
  useEffect(() => {
    const slowTimer = setInterval(() => {
      setVitals((prev) => {
        // Tiny drift function: current ± maxStep, clamped to [min, max]
        const drift = (val: number, min: number, max: number, step = 1) => {
          const delta = (Math.random() - 0.5) * 2 * step;
          return Math.min(max, Math.max(min, Math.round(val + delta)));
        };
        const driftFloat = (
          val: number,
          min: number,
          max: number,
          step = 0.1,
        ) => {
          const delta = (Math.random() - 0.5) * 2 * step;
          return Math.min(max, Math.max(min, +(val + delta).toFixed(1)));
        };

        return {
          ...prev,
          spO2: drift(prev.spO2, 94, 100, 1),
          hrv: drift(prev.hrv, 30, 65, 1),
          stress: drift(prev.stress, 10, 60, 1),
          bodyTemp: driftFloat(prev.bodyTemp, 97.5, 99.2, 0.1),
          respRate: drift(prev.respRate, 12, 20, 1),
          bloodPressureSys: drift(prev.bloodPressureSys, 105, 135, 1),
          bloodPressureDia: drift(prev.bloodPressureDia, 65, 88, 1),
          // Diagnostic scores — very slow ±1 drift
          heartRhythm: drift(prev.heartRhythm, 78, 98, 1),
          tremorScore: drift(prev.tremorScore, 2, 25, 1),
          seizureRisk: drift(prev.seizureRisk, 2, 20, 1),
          gaitStability: drift(prev.gaitStability, 75, 98, 1),
          panicScore: drift(prev.panicScore, 5, 35, 1),
        };
      });
    }, 5000); // every 5 seconds
    return () => clearInterval(slowTimer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, showChat]);

  // Mark messages as read when chat is open
  useEffect(() => {
    if (showChat) {
      const unreadIds = chatMessages
        .filter((m) => m.sender === "support" && !m.read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        markMessagesAsRead(unreadIds);
      }
    }
  }, [showChat, chatMessages]);

  // ─── Geolocation: fire-and-forget, sends location as chat message ───
  const sendLocationToChat = useCallback(
    (userId: string, isEmergency: boolean) => {
      if (!navigator.geolocation) {
        // No geolocation API — send fallback message
        push(ref(db, "chat_messages"), {
          userId,
          sender: "system",
          text: isEmergency
            ? "🚨📍 EMERGENCY LOCATION: Browser does not support geolocation."
            : "📍 Patient location: Browser does not support geolocation.",
          timestamp: Date.now(),
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          await push(ref(db, "chat_messages"), {
            userId,
            sender: "system",
            text: isEmergency
              ? `🚨📍 EMERGENCY LOCATION: ${lat.toFixed(6)}, ${lng.toFixed(6)} — https://www.google.com/maps?q=${lat},${lng}`
              : `📍 Patient location: ${lat.toFixed(6)}, ${lng.toFixed(6)} — https://www.google.com/maps?q=${lat},${lng}`,
            timestamp: Date.now(),
          });
          await update(ref(db, `users/${userId}`), {
            lastLocation: { lat, lng, updatedAt: Date.now() },
          });
        },
        async () => {
          // Permission denied or error — still send a message
          await push(ref(db, "chat_messages"), {
            userId,
            sender: "system",
            text: isEmergency
              ? "🚨📍 EMERGENCY LOCATION: Location access was denied by patient. Please contact them directly."
              : "📍 Patient location: Location access was denied. Please contact the patient for their location.",
            timestamp: Date.now(),
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    },
    [],
  );

  // ─── Request Support: sets needsSupport + creates alert + sends location + auto-opens chat ───
  const requestSupport = useCallback(async () => {
    if (!user) return;
    try {
      // Set needsSupport flag
      await update(ref(db, `users/${user.id}`), { needsSupport: true });

      // Create an alert visible in admin's Alert Management
      await createSupportAlert(user.id, "support_request");

      // Send an automatic chat message
      await push(ref(db, "chat_messages"), {
        userId: user.id,
        sender: "patient",
        text: "🆘 I need medical support. Please assist.",
        timestamp: Date.now(),
      });

      // Fire-and-forget: capture & send location in background
      sendLocationToChat(user.id, false);

      // Open the chat panel
      setShowChat(true);

      toast.success("Support requested — our team has been notified!");
    } catch {
      toast.error("Failed to request support");
    }
  }, [user, sendLocationToChat]);

  // ─── Emergency SOS: creates critical alert + sends location + sets needsSupport ───
  const handleEmergencySOS = useCallback(async () => {
    if (!user) return;
    try {
      // Create a critical emergency alert in admin
      await createEmergencyAlert(user.id);

      // Auto-send emergency chat message
      await push(ref(db, "chat_messages"), {
        userId: user.id,
        sender: "patient",
        text: "🚨 EMERGENCY SOS — Immediate assistance required! Patient has triggered emergency protocol.",
        timestamp: Date.now(),
      });

      // Fire-and-forget: capture & send location in background
      sendLocationToChat(user.id, true);

      setShowChat(true);
      setSosCameraActive(true);
      toast.success("Emergency SOS sent — help is on the way!", {
        icon: "🚨",
        duration: 5000,
      });
    } catch {
      toast.error("Failed to send SOS");
    }
  }, [user, sendLocationToChat]);

  // ─── Send Chat Message: auto-sets needsSupport on first message ───
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || !user) return;
      try {
        // If in "new chat" mode, auto-resolve the previous session first
        if (newChatMode && chatMessages.length > 0) {
          // Check if there's already an unresolved session
          const lastMsg = chatMessages[chatMessages.length - 1];
          const isAlreadyResolved =
            lastMsg?.sender === "system" &&
            lastMsg?.text?.toLowerCase().includes("resolved");
          if (!isAlreadyResolved) {
            await push(ref(db, "chat_messages"), {
              userId: user.id,
              sender: "system",
              text: "Session resolved — new chat started by patient",
              timestamp: Date.now() - 1, // slightly before new message
            });
          }
        }

        // Ensure needsSupport is set so admin sees this in "Open Requests"
        await update(ref(db, `users/${user.id}`), { needsSupport: true });

        await push(ref(db, "chat_messages"), {
          userId: user.id,
          sender: "patient",
          text: chatInput.trim(),
          timestamp: Date.now(),
        });
        setChatInput("");

        // Exit new chat mode — show the new message in the latest session
        if (newChatMode) {
          setNewChatMode(false);
          setActiveSessionIdx(null);
        }
      } catch {
        toast.error("Failed to send message");
      }
    },
    [chatInput, user, newChatMode, chatMessages],
  );

  // ─── Patient Media Upload ───
  const handlePatientMediaUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      if (!file.type.startsWith("image/")) {
        toast.error("Only images are supported");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            const maxDim = 800;
            let w = img.width,
              h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            await update(ref(db, `users/${user.id}`), { needsSupport: true });
            await push(ref(db, "chat_messages"), {
              userId: user.id,
              sender: "patient",
              text: "🖼️ Image shared by patient",
              mediaUrl: dataUrl,
              timestamp: Date.now(),
            });
            toast.success("Image sent");
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error("Failed to upload image");
      }
      if (patientFileRef.current) patientFileRef.current.value = "";
    },
    [user],
  );

  const toggleMed = useCallback(
    (index: number) => {
      setMedStatus((prev) => {
        const next = [...prev];
        next[index] = !next[index];
        return next;
      });
      toast.success(
        medStatus[index]
          ? "Medication unmarked"
          : "Medication marked as taken ✓",
      );
    },
    [medStatus],
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0C1210] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#2A3D2E] border-t-[#D4B896] rounded-full animate-spin" />
        <p className="font-poppins text-[#D4B896] text-lg">
          Loading your health data...
        </p>
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#D4B896] rounded-full"
              style={{
                animation: `typingBounce 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const latest = ecgData.length > 0 ? ecgData[ecgData.length - 1] : null;
  const currentBpm = monitorDisabled ? 0 : latest?.bpm || 72;
  const status = monitorDisabled
    ? ("critical" as const)
    : calculateBpmStatus(currentBpm);
  const sColor = monitorDisabled
    ? "#E05252"
    : status === "critical"
      ? "#E05252"
      : status === "warning"
        ? "#D4943A"
        : "#4CAF78";
  const statusLabel = monitorDisabled
    ? "Disabled"
    : status === "critical"
      ? "Critical"
      : status === "warning"
        ? "Elevated"
        : "Normal";

  // Zero out all vitals when monitoring is disabled
  const displayVitals = monitorDisabled
    ? {
        spO2: 0,
        hrv: 0,
        stress: 0,
        bodyTemp: 0,
        respRate: 0,
        bloodPressureSys: 0,
        bloodPressureDia: 0,
        heartRhythm: 0,
        tremorScore: 0,
        seizureRisk: 0,
        gaitStability: 0,
        panicScore: 0,
      }
    : vitals;

  const stressLevel =
    displayVitals.stress < 30
      ? "Low"
      : displayVitals.stress < 55
        ? "Moderate"
        : "High";
  const stressColor =
    displayVitals.stress < 30
      ? "#4CAF78"
      : displayVitals.stress < 55
        ? "#D4943A"
        : "#E05252";
  const visibleTips = healthTips.filter((_, i) => !dismissedTips.includes(i));

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <div className="min-h-screen bg-[#0C1210] text-white relative overflow-x-hidden">
      {/* ═══ MONITOR DISABLED BANNER (non-blocking) ═══ */}
      <AnimatePresence>
        {monitorDisabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-[60] bg-gradient-to-r from-[#2D1515] via-[#1C1210] to-[#2D1515] border-b border-[#E05252]/30 px-4 py-3 md:px-8 md:py-4"
          >
            <div className="max-w-[1480px] mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#E05252]/15 rounded-xl">
                  <PowerOff className="w-5 h-5 text-[#E05252]" />
                </div>
                <div>
                  <h3 className="text-[#E05252] font-poppins font-bold text-sm md:text-base">
                    Medical Kit Not Working Properly
                  </h3>
                  <p className="text-[#9BA897] text-[10px] md:text-xs">
                    Your Guardian Pulse medical kit is currently experiencing
                    issues. ECG and vitals data are temporarily unavailable.
                    Contact support for assistance.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={requestSupport}
                  className="flex items-center gap-1.5 bg-[#1C2B1E] hover:bg-[#2A3D2E] border border-[rgba(212,184,150,0.2)] hover:border-[#D4B896] text-[#D4B896] px-3 py-2 rounded-xl transition-all text-[10px] md:text-xs font-semibold"
                >
                  <LifeBuoy className="w-3.5 h-3.5" /> Support
                </button>
              </div>
            </div>
            {/* Animated flatline bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px]">
              <svg
                viewBox="0 0 1200 4"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <motion.line
                  x1="0"
                  y1="2"
                  x2="1200"
                  y2="2"
                  stroke="#E05252"
                  strokeWidth="2"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 px-3 py-2.5 md:px-8 md:py-4 flex items-center justify-between border-b border-[rgba(212,184,150,0.1)] bg-[rgba(12,18,16,0.92)] backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 md:h-10 md:w-10 bg-[#1C2B1E] rounded-xl flex items-center justify-center relative border border-[rgba(212,184,150,0.2)]">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#4CAF78] rounded-full border-2 border-[#0C1210] live-dot" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-base md:text-xl text-[#F0E6D3]">
              Guardian Pulse
            </h1>
            <p
              className={`text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-[0.2em] font-semibold ${monitorDisabled ? "text-[#E05252]" : "text-[#D4B896]"}`}
            >
              Patient Portal •{" "}
              {monitorDisabled ? "Monitoring Paused" : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-5">
          {status !== "normal" && (
            <motion.div
              {...fadeUp()}
              className="hidden sm:flex items-center space-x-2 bg-[rgba(224,82,82,0.12)] border border-[rgba(224,82,82,0.3)] px-3 py-1.5 rounded-full"
            >
              <span className="w-2 h-2 bg-[#E05252] rounded-full animate-ping" />
              <span className="text-[#E05252] text-xs font-bold uppercase tracking-wider">
                Anomaly
              </span>
            </motion.div>
          )}
          <div className="hidden md:block text-right">
            <p className="text-[#F0E6D3] font-mono font-semibold text-sm">
              {fmtTime(time)}
            </p>
            <p className="text-[#7A8A76] text-[10px] font-semibold uppercase tracking-wider">
              {fmtDate(time)}
            </p>
          </div>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox:
                  "h-9 w-9 md:h-10 md:w-10 border-2 border-[rgba(212,184,150,0.3)]",
              },
            }}
          />
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="px-3 py-5 md:px-8 md:py-8 max-w-[1480px] mx-auto space-y-5 md:space-y-6">
        {/* ─── Greeting + Emergency ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <motion.div {...fadeUp()}>
            <h2 className="font-poppins text-xl sm:text-2xl md:text-4xl font-bold text-[#F0E6D3]">
              Hello,{" "}
              <span className="text-[#D4B896]">
                {user.firstName || "Patient"}
              </span>{" "}
              👋
            </h2>
            <p className="text-[#9BA897] text-xs sm:text-sm md:text-base mt-1">
              Your health vitals are being continuously monitored in real-time.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="flex gap-2 md:gap-3">
            <button
              onClick={requestSupport}
              className="flex items-center gap-1.5 md:gap-2 bg-[#1C2B1E] hover:bg-[#2A3D2E] active:scale-95 border border-[rgba(212,184,150,0.2)] hover:border-[#D4B896] text-[#D4B896] px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-xs md:text-sm font-semibold"
            >
              <LifeBuoy className="w-4 h-4" /> Support
            </button>
            <button
              onClick={handleEmergencySOS}
              className="flex items-center gap-1.5 md:gap-2 bg-[#E05252] hover:bg-[#C33] active:scale-95 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-xs md:text-sm font-bold shadow-[0_4px_20px_rgba(224,82,82,0.4)]"
            >
              <Phone className="w-4 h-4" /> Emergency SOS
            </button>
          </motion.div>
        </div>

        {/* ─── Row 2: BPM Hero + Vitals Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* BPM Hero Card */}
          <motion.div
            {...fadeUp(0.15)}
            className="lg:col-span-4 bg-[#141E18] rounded-2xl md:rounded-3xl p-5 md:p-6 border border-[rgba(212,184,150,0.1)] relative overflow-hidden flex flex-col items-center justify-center min-h-[260px] md:min-h-[320px]"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-48 md:w-64 h-48 md:h-64 rounded-full blur-[80px] opacity-20"
                style={{ backgroundColor: sColor }}
              />
            </div>
            {status === "critical" && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute w-40 md:w-52 h-40 md:h-52 rounded-full border-2"
                style={{ borderColor: sColor }}
              />
            )}
            <Heart
              className="w-7 h-7 md:w-8 md:h-8 mb-3 animate-heartbeat"
              style={{ color: sColor }}
            />
            <div className="flex items-baseline gap-2 z-10">
              <motion.span
                key={currentBpm}
                initial={{ scale: 1.2, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-6xl md:text-8xl font-black tracking-tighter"
                style={{ color: sColor }}
              >
                {currentBpm}
              </motion.span>
              <span className="text-[#9BA897] text-lg md:text-xl font-bold">
                BPM
              </span>
            </div>
            <div
              className="mt-3 md:mt-4 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] border z-10"
              style={{
                color: sColor,
                borderColor: `${sColor}50`,
                backgroundColor: `${sColor}15`,
              }}
            >
              {statusLabel}
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-0">
              <ECGWaveBg color={sColor} />
            </div>
          </motion.div>

          {/* Vitals Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-4">
            {[
              {
                label: "Blood O₂",
                value: `${displayVitals.spO2}%`,
                icon: Droplets,
                color: monitorDisabled
                  ? "#6B7F67"
                  : displayVitals.spO2 > 95
                    ? "#4CAF78"
                    : "#D4943A",
                trend: displayVitals.spO2 > 96 ? "up" : "down",
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : displayVitals.spO2 > 95
                    ? "Healthy oxygen saturation"
                    : "Slightly low — take deep breaths",
              },
              {
                label: "Stress",
                value: monitorDisabled ? "N/A" : stressLevel,
                icon: Brain,
                color: monitorDisabled ? "#6B7F67" : stressColor,
                sub: `${displayVitals.stress}/100`,
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : `Your stress score is ${displayVitals.stress}. ${displayVitals.stress < 30 ? "Great job staying calm!" : "Try breathing exercises."}`,
              },
              {
                label: "HRV",
                value: `${displayVitals.hrv}ms`,
                icon: Activity,
                color: monitorDisabled ? "#6B7F67" : "#5B9BD5",
                trend: displayVitals.hrv > 40 ? "up" : "down",
                detail:
                  "Heart Rate Variability — higher is better for recovery",
              },
              {
                label: "Body Temp",
                value: monitorDisabled ? "0°F" : `${displayVitals.bodyTemp}°F`,
                icon: Thermometer,
                color: monitorDisabled
                  ? "#6B7F67"
                  : displayVitals.bodyTemp > 99
                    ? "#E05252"
                    : "#D4B896",
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : displayVitals.bodyTemp > 99
                    ? "Slightly elevated — monitor closely"
                    : "Normal body temperature",
              },
              {
                label: "Resp Rate",
                value: `${displayVitals.respRate}`,
                icon: Wind,
                color: monitorDisabled ? "#6B7F67" : "#4CAF78",
                sub: "br/min",
                detail: "Normal respiratory range is 12-20 breaths/min",
              },
              {
                label: "Blood Pressure",
                value: `${displayVitals.bloodPressureSys}/${displayVitals.bloodPressureDia}`,
                icon: Heart,
                color: monitorDisabled
                  ? "#6B7F67"
                  : displayVitals.bloodPressureSys > 130
                    ? "#E05252"
                    : "#D4B896",
                sub: "mmHg",
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : displayVitals.bloodPressureSys <= 120
                    ? "Optimal blood pressure"
                    : "Slightly elevated",
              },
              {
                label: "Heart Rhythm",
                value: `${displayVitals.heartRhythm}%`,
                icon: Waves,
                color: monitorDisabled
                  ? "#6B7F67"
                  : displayVitals.heartRhythm > 85
                    ? "#4CAF78"
                    : "#D4943A",
                sub: "regularity",
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : displayVitals.heartRhythm > 85
                    ? "Normal sinus rhythm detected"
                    : "Minor irregularity — under observation",
              },
              {
                label: "Tremor Index",
                value: `${displayVitals.tremorScore}`,
                icon: Activity,
                color: monitorDisabled
                  ? "#6B7F67"
                  : displayVitals.tremorScore < 15
                    ? "#4CAF78"
                    : "#E05252",
                sub: "/100",
                detail: monitorDisabled
                  ? "Monitoring disabled"
                  : displayVitals.tremorScore < 15
                    ? "Minimal tremor activity"
                    : "Elevated tremor detected — alerting care team",
              },
            ].map((card, i) => {
              const isExpanded = expandedVital === card.label;
              return (
                <motion.button
                  key={card.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  onClick={() =>
                    setExpandedVital(isExpanded ? null : card.label)
                  }
                  className={`bg-[#141E18] rounded-xl md:rounded-2xl p-3 md:p-4 border transition-all group relative overflow-hidden text-left w-full ${isExpanded ? "border-[rgba(212,184,150,0.35)] shadow-[0_0_20px_rgba(212,184,150,0.08)]" : "border-[rgba(212,184,150,0.08)] hover:border-[rgba(212,184,150,0.25)]"}`}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
                    }}
                  />
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div
                      className="p-1.5 md:p-2 rounded-lg"
                      style={{ backgroundColor: `${card.color}15` }}
                    >
                      <card.icon
                        className="w-3.5 h-3.5 md:w-4 md:h-4"
                        style={{ color: card.color }}
                      />
                    </div>
                    {card.trend &&
                      (card.trend === "up" ? (
                        <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#4CAF78]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E05252]" />
                      ))}
                  </div>
                  <motion.p
                    key={card.value}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="font-mono font-bold text-base md:text-xl text-[#F0E6D3] leading-none"
                  >
                    {card.value}
                  </motion.p>
                  {card.sub && (
                    <p className="text-[9px] md:text-[10px] text-[#7A8A76] mt-0.5 font-medium">
                      {card.sub}
                    </p>
                  )}
                  <p className="text-[9px] md:text-[10px] text-[#9BA897] uppercase tracking-[0.12em] md:tracking-[0.15em] font-semibold mt-1.5 md:mt-2">
                    {card.label}
                  </p>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[11px] text-[#C0B8A9] mt-2 pt-2 border-t border-[rgba(212,184,150,0.1)] leading-relaxed">
                          {card.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ─── Row 3: ECG Chart + Stress + BP ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <motion.div
            {...fadeUp(0.3)}
            className="lg:col-span-7 bg-[#141E18] rounded-2xl md:rounded-3xl p-4 md:p-6 border border-[rgba(212,184,150,0.1)] relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-[rgba(91,155,213,0.12)] rounded-lg">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-[#5B9BD5]" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-sm md:text-base text-[#F0E6D3]">
                    Live ECG Telemetry
                  </h3>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">
                    Real-time heart monitoring
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 bg-[#1C2B1E] px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-[rgba(76,175,120,0.3)]">
                <span
                  className={`w-2 h-2 rounded-full ${monitorDisabled ? "bg-[#E05252]" : "bg-[#4CAF78] live-dot shadow-[0_0_6px_#4CAF78]"}`}
                />
                <span
                  className={`text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider ${monitorDisabled ? "text-[#E05252]" : "text-[#4CAF78]"}`}
                >
                  {monitorDisabled ? "Flatline" : "Live"}
                </span>
              </div>
            </div>
            <div className="h-[180px] md:h-[240px] rounded-xl md:rounded-2xl bg-[#0C1210] border border-[rgba(91,155,213,0.1)] p-1.5 md:p-2">
              <LiveECGChart
                bpm={currentBpm}
                height="100%"
                color={sColor}
                bufferSize={120}
              />
            </div>
          </motion.div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
            {/* Stress Monitor */}
            <motion.div
              {...fadeUp(0.35)}
              className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]"
            >
              <div className="flex items-center gap-2 mb-3 md:mb-4 w-full">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                  Stress Monitor
                </h4>
              </div>
              <div className="w-full bg-[#0C1210] rounded-full h-3 md:h-4 overflow-hidden border border-[rgba(212,184,150,0.08)]">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${displayVitals.stress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{
                    background: `linear-gradient(90deg, #4CAF78, ${stressColor})`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between w-full mt-2 md:mt-3">
                <span className="text-[10px] md:text-xs text-[#7A8A76]">0</span>
                <span
                  className="font-mono font-bold text-base md:text-lg"
                  style={{ color: stressColor }}
                >
                  {displayVitals.stress}
                </span>
                <span className="text-[10px] md:text-xs text-[#7A8A76]">
                  100
                </span>
              </div>
              <div className="text-center">
                <span
                  className="text-[10px] md:text-xs font-bold uppercase tracking-wider"
                  style={{ color: stressColor }}
                >
                  {stressLevel} Stress
                </span>
              </div>
            </motion.div>

            {/* Blood Pressure */}
            <motion.div
              {...fadeUp(0.4)}
              className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]"
            >
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Waves className="w-4 h-4 md:w-5 md:h-5 text-[#E05252]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                  Blood Pressure
                </h4>
              </div>
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div className="text-center">
                  <motion.p
                    key={displayVitals.bloodPressureSys}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono text-2xl md:text-3xl font-bold text-[#F0E6D3]"
                  >
                    {displayVitals.bloodPressureSys}
                  </motion.p>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">
                    Systolic
                  </p>
                </div>
                <span className="text-xl md:text-2xl text-[#5C6B58] font-light">
                  /
                </span>
                <div className="text-center">
                  <motion.p
                    key={displayVitals.bloodPressureDia}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono text-2xl md:text-3xl font-bold text-[#F0E6D3]"
                  >
                    {displayVitals.bloodPressureDia}
                  </motion.p>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">
                    Diastolic
                  </p>
                </div>
                <span className="text-xs md:text-sm text-[#7A8A76] ml-1 md:ml-2 font-medium">
                  mmHg
                </span>
              </div>
              <div className="mt-2 md:mt-3 text-center">
                <span
                  className={`text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${monitorDisabled ? "text-[#6B7F67] border-[#6B7F67]/30 bg-[#6B7F67]/10" : displayVitals.bloodPressureSys <= 120 ? "text-[#4CAF78] border-[#4CAF78]/30 bg-[#4CAF78]/10" : displayVitals.bloodPressureSys <= 130 ? "text-[#D4943A] border-[#D4943A]/30 bg-[#D4943A]/10" : "text-[#E05252] border-[#E05252]/30 bg-[#E05252]/10"}`}
                >
                  {monitorDisabled
                    ? "Disabled"
                    : displayVitals.bloodPressureSys <= 120
                      ? "Normal"
                      : displayVitals.bloodPressureSys <= 130
                        ? "Elevated"
                        : "High"}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Row 4: Medication + Health Tips + Activity ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Medication Reminders */}
          <motion.div
            {...fadeUp(0.45)}
            className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                  Medication Schedule
                </h4>
              </div>
              <span className="text-[9px] md:text-[10px] text-[#7A8A76] font-mono">
                {medStatus.filter(Boolean).length}/{medications.length} taken
              </span>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              {medications.map((med, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleMed(i)}
                  className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl border transition-all w-full text-left cursor-pointer ${medStatus[i] ? "bg-[rgba(76,175,120,0.06)] border-[rgba(76,175,120,0.25)]" : "bg-[#0C1210] border-[rgba(212,184,150,0.08)] hover:border-[rgba(212,184,150,0.2)]"}`}
                >
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <motion.div
                      animate={
                        medStatus[i]
                          ? { backgroundColor: "rgba(76,175,120,0.2)" }
                          : { backgroundColor: "rgba(212,184,150,0.08)" }
                      }
                      className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center"
                    >
                      {medStatus[i] ? (
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#4CAF78]" />
                      ) : (
                        <span className="text-[#D4B896] text-xs">•</span>
                      )}
                    </motion.div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-[#F0E6D3]">
                        {med.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#7A8A76]" />
                        <p className="text-[9px] md:text-[10px] text-[#7A8A76]">
                          {med.time} · {med.dosage}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-full shrink-0 ${medStatus[i] ? "text-[#4CAF78] bg-[#4CAF78]/10" : "text-[#D4943A] bg-[#D4943A]/10"}`}
                  >
                    {medStatus[i] ? "Taken" : "Pending"}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Health Tips */}
          <motion.div
            {...fadeUp(0.5)}
            className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)] hover:border-[rgba(212,184,150,0.2)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#4CAF78]" />
                </motion.div>
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                  Health Tips
                </h4>
              </div>
              <motion.span
                key={visibleTips.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-[9px] md:text-[10px] text-[#7A8A76] bg-[#0C1210] px-2 py-0.5 rounded-full border border-[rgba(212,184,150,0.08)]"
              >
                {visibleTips.length} tips
              </motion.span>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              <AnimatePresence mode="popLayout">
                {visibleTips.length === 0 ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Check className="w-8 h-8 text-[#4CAF78] mx-auto mb-2" />
                    </motion.div>
                    <p className="text-sm text-[#9BA897] font-medium">
                      All tips reviewed! 🎉
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDismissedTips([])}
                      className="text-xs text-[#D4B896] mt-3 px-4 py-1.5 rounded-full border border-[rgba(212,184,150,0.2)] hover:bg-[rgba(212,184,150,0.08)] transition-all"
                    >
                      ↺ Show again
                    </motion.button>
                  </motion.div>
                ) : (
                  visibleTips.map((item, idx) => {
                    const originalIndex = healthTips.indexOf(item);
                    return (
                      <motion.div
                        key={originalIndex}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          x: -100,
                          height: 0,
                          marginBottom: 0,
                        }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="flex items-start gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-xl bg-[#0C1210] border border-[rgba(212,184,150,0.06)] hover:border-[rgba(212,184,150,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group cursor-default relative overflow-hidden"
                      >
                        {/* Accent line */}
                        <div
                          className="absolute top-0 left-0 bottom-0 w-[2px] rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <motion.div
                          whileHover={{ rotate: 10 }}
                          className="p-1.5 md:p-2 rounded-lg shrink-0 ml-1"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <item.icon
                            className="w-3.5 h-3.5 md:w-4 md:h-4"
                            style={{ color: item.color }}
                          />
                        </motion.div>
                        <p className="text-xs md:text-sm text-[#C0B8A9] leading-relaxed flex-1">
                          {item.tip}
                        </p>
                        <motion.button
                          whileHover={{
                            scale: 1.2,
                            backgroundColor: "rgba(224,82,82,0.15)",
                          }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => {
                            setDismissedTips((prev) => [
                              ...prev,
                              originalIndex,
                            ]);
                            toast.success("Tip dismissed", { icon: "💡" });
                          }}
                          className="p-1 md:p-1.5 rounded-md bg-[rgba(212,184,150,0.05)] hover:bg-[rgba(212,184,150,0.12)] transition-all shrink-0"
                        >
                          <X className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#7A8A76]" />
                        </motion.button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Diagnostic Reports */}
          <motion.div
            {...fadeUp(0.55)}
            className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)] hover:border-[rgba(212,184,150,0.2)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 5,
                  }}
                >
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                </motion.div>
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                  Diagnostic Reports
                </h4>
              </div>
              <span
                className={`text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  monitorDisabled
                    ? "bg-[rgba(224,82,82,0.1)] text-[#E05252] border-[#E05252]/30"
                    : "bg-[rgba(76,175,120,0.1)] text-[#4CAF78] border-[#4CAF78]/30"
                }`}
              >
                {monitorDisabled ? "Disabled" : "Live"}
              </span>
            </div>
            <DiagnosticReportsList vitals={displayVitals} />
          </motion.div>
        </div>

        {/* ─── Row 5: Chat Support ─── */}
        <motion.div
          {...fadeUp(0.6)}
          className="bg-[#141E18] rounded-2xl md:rounded-3xl border border-[rgba(212,184,150,0.1)] overflow-hidden hover:border-[rgba(212,184,150,0.2)] transition-colors"
        >
          {(() => {
            const unreadCount = chatMessages.filter(
              (m) => m.sender === "support" && !m.read
            ).length;

            // Group messages into sessions
            const sessions: {
              messages: typeof chatMessages;
              resolved: boolean;
              startTime: number;
            }[] = [];
            let currentSession: typeof chatMessages = [];
            chatMessages.forEach((m) => {
              currentSession.push(m);
              if (
                m.sender === "system" &&
                m.text.toLowerCase().includes("resolved")
              ) {
                sessions.push({
                  messages: [...currentSession],
                  resolved: true,
                  startTime: currentSession[0]?.timestamp || 0,
                });
                currentSession = [];
              }
            });
            if (currentSession.length > 0) {
              sessions.push({
                messages: currentSession,
                resolved: false,
                startTime: currentSession[0]?.timestamp || 0,
              });
            }
            const hasResolvedSessions = sessions.some((s) => s.resolved);
            const latestIsResolved =
              sessions.length > 0 && sessions[sessions.length - 1].resolved;

            // Determine which session to display
            // newChatMode = true means user explicitly clicked "New Chat"
            const viewIdx = newChatMode
              ? -1 // sentinel for "empty new chat"
              : activeSessionIdx !== null
                ? activeSessionIdx
                : sessions.length - 1;
            const viewingHistory =
              !newChatMode &&
              activeSessionIdx !== null &&
              activeSessionIdx < sessions.length - 1;
            const currentViewSession = viewIdx >= 0 ? sessions[viewIdx] : null;

            return (
              <>
                <button
                  onClick={() => {
                    setShowChat(!showChat);
                    setActiveSessionIdx(null);
                    setNewChatMode(false);
                  }}
                  className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(0,0,0,0.3)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-[rgba(212,184,150,0.12)] rounded-full flex items-center justify-center relative">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-4.5 h-4.5 md:w-5 md:h-5 bg-[#E05252] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(224,82,82,0.5)]"
                        >
                          <span className="text-[8px] md:text-[9px] text-white font-bold">
                            {Math.min(unreadCount, 9)}
                            {unreadCount > 9 ? "+" : ""}
                          </span>
                        </motion.div>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-poppins font-semibold text-[#F0E6D3] text-xs md:text-sm">
                        Contact Medical Support
                      </h3>
                      <p className="text-[9px] md:text-[10px] text-[#7A8A76]">
                        {latestIsResolved
                          ? "Previous session resolved — start new chat"
                          : unreadCount > 0
                            ? `${unreadCount} new response${unreadCount > 1 ? "s" : ""} from support`
                            : "Chat with Guardian Pulse admin team"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sessions.length > 1 && (
                      <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-[rgba(212,184,150,0.08)] text-[#D4B896] border border-[rgba(212,184,150,0.15)] rounded-full font-bold">
                        {sessions.length} chats
                      </span>
                    )}
                    <ChevronUp
                      className={`w-4 h-4 md:w-5 md:h-5 text-[#9BA897] transition-transform ${showChat ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {showChat && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-[rgba(212,184,150,0.08)] overflow-hidden"
                    >
                      {/* ─── Session Picker Tabs ─── */}
                      {sessions.length >= 1 && (
                        <div className="relative bg-[rgba(0,0,0,0.15)] border-b border-[rgba(212,184,150,0.06)]">
                          {/* Gradient fade edges to indicate scrollability */}
                          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[rgba(0,0,0,0.3)] to-transparent z-10 rounded-l" />
                          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[rgba(0,0,0,0.3)] to-transparent z-10 rounded-r" />
                          {/* Scrollable tab strip */}
                          <div
                            className="px-4 md:px-5 py-2 md:py-2.5 overflow-x-auto"
                            style={{
                              scrollbarWidth: "thin",
                              scrollbarColor:
                                "rgba(212,184,150,0.2) transparent",
                            }}
                          >
                            <div className="flex gap-1.5 md:gap-2 min-w-max">
                              {sessions.map((s, idx) => {
                                const isActive =
                                  !newChatMode && idx === viewIdx;
                                const date = new Date(s.startTime);
                                const label = s.resolved
                                  ? `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · Resolved`
                                  : "Current";
                                return (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSessionIdx(idx);
                                      setNewChatMode(false);
                                    }}
                                    className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-semibold transition-all whitespace-nowrap shrink-0 ${
                                      isActive
                                        ? "bg-[#D4B896] text-[#0C1210] shadow-[0_0_10px_rgba(212,184,150,0.2)]"
                                        : s.resolved
                                          ? "bg-[rgba(76,175,120,0.08)] text-[#4CAF78] border border-[#4CAF78]/20 hover:bg-[rgba(76,175,120,0.15)]"
                                          : "bg-[rgba(212,184,150,0.06)] text-[#9BA897] border border-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.1)]"
                                    }`}
                                  >
                                    {s.resolved ? `📋 ${label}` : `💬 ${label}`}
                                  </button>
                                );
                              })}
                              {/* "Start New" button — always available */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewChatMode(true);
                                  setActiveSessionIdx(null);
                                }}
                                className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-semibold whitespace-nowrap shrink-0 transition-all ${
                                  newChatMode
                                    ? "bg-[#D4B896] text-[#0C1210] shadow-[0_0_10px_rgba(212,184,150,0.2)]"
                                    : "bg-[rgba(212,184,150,0.06)] text-[#D4B896] border border-[rgba(212,184,150,0.15)] hover:bg-[rgba(212,184,150,0.1)]"
                                }`}
                              >
                                ✨ New Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ─── Messages Area ─── */}
                      <div className="h-[280px] md:h-[380px] overflow-y-auto p-4 md:p-5 space-y-2.5 md:space-y-3">
                        {/* Viewing history banner */}
                        {viewingHistory && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-center gap-2 py-2 px-4 bg-[rgba(212,184,150,0.06)] border border-[rgba(212,184,150,0.1)] rounded-xl mb-3"
                          >
                            <Clock className="w-3 h-3 text-[#D4B896]" />
                            <span className="text-[10px] text-[#D4B896] font-medium">
                              Viewing chat history — Session {viewIdx + 1}
                            </span>
                            <button
                              onClick={() => {
                                setActiveSessionIdx(null);
                                setNewChatMode(false);
                              }}
                              className="text-[9px] text-[#4CAF78] font-bold hover:underline ml-2"
                            >
                              Back to current
                            </button>
                          </motion.div>
                        )}

                        {(!currentViewSession ||
                          currentViewSession.messages.length === 0) &&
                        !viewingHistory ? (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                            <motion.div
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <div className="bg-[rgba(212,184,150,0.05)] p-4 md:p-5 rounded-full border border-[rgba(212,184,150,0.1)]">
                                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-[#7A8A76]" />
                              </div>
                            </motion.div>
                            <p className="text-[#9BA897] text-xs md:text-sm font-medium">
                              Start a new conversation
                            </p>
                            <p className="text-[#7A8A76] text-[10px] md:text-xs max-w-xs">
                              Type below to get medical support from our team.
                            </p>
                          </div>
                        ) : currentViewSession ? (
                          <>
                            {currentViewSession.messages.map((m, mIdx) => {
                              const isMe = m.sender === "patient";
                              const isSystem =
                                m.sender === "system" || m.sender === "ai";

                              if (isSystem) {
                                const isResolved = m.text
                                  .toLowerCase()
                                  .includes("resolved");
                                return (
                                  <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: mIdx * 0.02 }}
                                    className="flex justify-center my-3"
                                  >
                                    <div
                                      className={`flex items-center gap-1.5 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-medium border ${
                                        isResolved
                                          ? "bg-[rgba(76,175,120,0.08)] border-[rgba(76,175,120,0.2)] text-[#4CAF78]"
                                          : "bg-[rgba(0,0,0,0.3)] border-[rgba(212,184,150,0.1)] text-[#9BA897]"
                                      }`}
                                    >
                                      {isResolved && (
                                        <Check className="w-3 h-3" />
                                      )}
                                      {m.sender === "ai" && (
                                        <Zap className="w-3 h-3 text-[#D4B896]" />
                                      )}
                                      <span>{m.text}</span>
                                    </div>
                                  </motion.div>
                                );
                              }

                              return (
                                <motion.div
                                  key={m.id}
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{
                                    delay: mIdx * 0.02,
                                    duration: 0.2,
                                  }}
                                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md ${
                                      isMe
                                        ? "bg-[rgba(212,184,150,0.12)] text-[#F0E6D3] rounded-tr-sm border border-[rgba(212,184,150,0.2)]"
                                        : "bg-[#1C2B1E] text-[#F0E6D3] rounded-tl-sm border border-[#2A3D2E]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span
                                        className={`text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${isMe ? "text-[#D4B896]" : "text-[#4CAF78]"}`}
                                      >
                                        {isMe ? "You" : "Support"}
                                      </span>
                                    </div>
                                    <p className="text-xs md:text-sm leading-relaxed">
                                      {m.text}
                                    </p>
                                    {m.mediaUrl && (
                                      <div
                                        className="mt-2 rounded-lg overflow-hidden border border-[rgba(212,184,150,0.1)] cursor-pointer group relative"
                                        onClick={() =>
                                          setLightboxSrc(m.mediaUrl!)
                                        }
                                      >
                                        <img
                                          src={m.mediaUrl}
                                          alt="Shared media"
                                          className="max-w-full max-h-48 object-contain rounded-lg transition-transform group-hover:scale-[1.02]"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                          <div className="bg-black/50 p-2 rounded-full">
                                            <ZoomIn className="w-4 h-4 text-white" />
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <p
                                      className={`text-[9px] md:text-[10px] mt-1.5 text-right font-medium ${isMe ? "text-[#D4B896]/60" : "text-[#7A8A76]"}`}
                                    >
                                      {fmtMsgTime(m.timestamp)}
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {/* Resolution prompt */}
                            {currentViewSession.resolved && !viewingHistory && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-2 py-4"
                              >
                                <div className="w-10 h-px bg-[rgba(212,184,150,0.1)]" />
                                <p className="text-[10px] md:text-xs text-[#5C6B58]">
                                  Session resolved by admin
                                </p>
                                <p className="text-[10px] md:text-xs text-[#9BA897]">
                                  Type below to start a new conversation
                                </p>
                              </motion.div>
                            )}
                          </>
                        ) : null}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input — hidden when viewing history */}
                      {!viewingHistory && (
                        <div className="p-3 md:p-4 bg-[rgba(0,0,0,0.15)] border-t border-[rgba(212,184,150,0.08)]">
                          <form
                            onSubmit={handleSendMessage}
                            className="flex gap-2 md:gap-3"
                          >
                            <input
                              ref={patientFileRef}
                              type="file"
                              accept="image/*"
                              onChange={handlePatientMediaUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => patientFileRef.current?.click()}
                              className="p-2.5 bg-[#0C1210] hover:bg-[#1C2B1E] border border-[rgba(212,184,150,0.15)] hover:border-[#D4B896] text-[#7A8A76] hover:text-[#D4B896] rounded-xl transition-colors shrink-0"
                              title="Upload image"
                            >
                              <ImagePlus className="w-4 h-4" />
                            </button>
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              className="flex-1 bg-[#0C1210] border border-[rgba(212,184,150,0.15)] focus:border-[#D4B896] text-[#F0E6D3] placeholder-[#5C6B58] rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none transition-colors text-xs md:text-sm"
                              placeholder={
                                latestIsResolved
                                  ? "Start a new conversation..."
                                  : "Type your concern here..."
                              }
                            />
                            <motion.button
                              type="submit"
                              disabled={!chatInput.trim()}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.92 }}
                              className="bg-[#D4B896] hover:bg-[#C4A882] disabled:opacity-40 disabled:cursor-not-allowed text-[#0C1210] p-2.5 md:p-3 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(212,184,150,0.2)]"
                            >
                              <Send className="w-4 h-4 md:w-5 md:h-5" />
                            </motion.button>
                          </form>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            );
          })()}
        </motion.div>

        {/* ─── Row 6: Settings ─── */}
        <motion.div
          {...fadeUp(0.65)}
          className="bg-[#141E18] rounded-2xl md:rounded-3xl border border-[rgba(212,184,150,0.1)] overflow-hidden hover:border-[rgba(212,184,150,0.2)] transition-colors"
        >
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(0,0,0,0.3)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-[rgba(212,184,150,0.12)] rounded-full flex items-center justify-center">
                <Settings className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
              </div>
              <div className="text-left">
                <h3 className="font-poppins font-semibold text-[#F0E6D3] text-xs md:text-sm">
                  Settings
                </h3>
                <p className="text-[9px] md:text-[10px] text-[#7A8A76]">
                  Update your phone number and profile details
                </p>
              </div>
            </div>
            <ChevronUp
              className={`w-4 h-4 md:w-5 md:h-5 text-[#9BA897] transition-transform ${showSettings ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-[rgba(212,184,150,0.08)] overflow-hidden"
              >
                <div className="p-4 md:p-6 space-y-5">
                  {/* Phone Number Setting */}
                  <div className="bg-[#0C1210] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.08)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-[rgba(212,184,150,0.08)]">
                        <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#D4B896]" />
                      </div>
                      <div>
                        <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">
                          Phone Number
                        </h4>
                        <p className="text-[9px] md:text-[10px] text-[#7A8A76]">
                          Visible to admins during emergencies
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="w-full bg-[#141E18] border border-[rgba(212,184,150,0.15)] focus:border-[#D4B896] text-[#F0E6D3] placeholder-[#5C6B58] rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none transition-colors text-xs md:text-sm font-mono"
                        />
                        {phoneNumber && phoneLoaded && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Check className="w-3.5 h-3.5 text-[#4CAF78]" />
                          </div>
                        )}
                      </div>
                      <motion.button
                        onClick={handleSavePhone}
                        disabled={phoneSaving || !phoneNumber.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.92 }}
                        className="bg-[#D4B896] hover:bg-[#C4A882] disabled:opacity-40 disabled:cursor-not-allowed text-[#0C1210] px-4 md:px-5 py-2.5 md:py-3 rounded-xl transition-all font-bold text-xs md:text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(212,184,150,0.2)]"
                      >
                        <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span>{phoneSaving ? "Saving..." : "Save"}</span>
                      </motion.button>
                    </div>
                    {phoneNumber.trim() && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] md:text-xs text-[#4CAF78] mt-2 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Your phone number will be displayed to admins in alerts
                        and patient records
                      </motion.p>
                    )}
                  </div>

                  {/* Profile Info (read-only) */}
                  <div className="bg-[#0C1210] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.08)]">
                    <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3] mb-3">
                      Profile Info
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-[rgba(212,184,150,0.06)]">
                        <span className="text-[10px] md:text-xs text-[#7A8A76] uppercase tracking-wider font-semibold">
                          Name
                        </span>
                        <span className="text-xs md:text-sm text-[#F0E6D3] font-medium">
                          {user?.firstName} {user?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-[rgba(212,184,150,0.06)]">
                        <span className="text-[10px] md:text-xs text-[#7A8A76] uppercase tracking-wider font-semibold">
                          Email
                        </span>
                        <span className="text-xs md:text-sm text-[#F0E6D3] font-medium">
                          {user?.primaryEmailAddress?.emailAddress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] md:text-xs text-[#7A8A76] uppercase tracking-wider font-semibold">
                          Phone
                        </span>
                        <span
                          className={`text-xs md:text-sm font-medium ${phoneNumber ? "text-[#4CAF78]" : "text-[#E05252]"}`}
                        >
                          {phoneNumber || "Not set — add above"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* ─── Image Lightbox ─── */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Shared media"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* ─── SOS Camera ─── */}
      {user && (
        <SOSCamera
          userId={user.id}
          isActive={sosCameraActive}
          onClose={() => setSosCameraActive(false)}
        />
      )}
      {/* ─── Floating Chat Button ─── */}
      <motion.button
        onClick={() => {
          setShowChat(true);
          setNewChatMode(true);
          setActiveSessionIdx(null);
          // Scroll to chat section
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 400);
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 300 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#D4B896] to-[#B89B6A] rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(212,184,150,0.4)] hover:shadow-[0_4px_30px_rgba(212,184,150,0.6)] hover:scale-110 active:scale-95 transition-all"
        title="Open chat"
      >
        <MessageSquare className="w-6 h-6 text-[#0C1210]" />
        {chatMessages &&
          chatMessages.filter(
            (m) =>
              m.sender === "support" && Date.now() - m.timestamp < 86400000,
          ).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E05252] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(224,82,82,0.5)]">
              <span className="text-[8px] text-white font-bold">!</span>
            </span>
          )}
      </motion.button>
    </div>
  );
}
