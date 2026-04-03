'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { usePatientECG, calculateBpmStatus, useChatMessages } from '@/lib/firebase-hooks';
import { startDemoDataSeeder, stopDemoDataSeeder, createSupportAlert, createEmergencyAlert, seedDemoVitals, syncVitalsToFirebase } from '@/lib/demo-data-seeder';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Phone, LifeBuoy, Activity, Send, Wind,
  MessageSquare, Thermometer, Droplets, Brain, Zap,
  TrendingUp, Clock, Pill, ChevronUp, ChevronDown, Waves,
  Check, X, Shield, AlertTriangle, Gauge, PersonStanding
} from 'lucide-react';
import DiagnosticReportsList from '@/components/DiagnosticReportsList';
import { ref, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────────
function fmtTime(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}
function fmtDate(d: Date) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
function fmtMsgTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

// ─── Animated ECG wave decoration ──
function ECGWaveBg({ color = '#4CAF78' }: { color?: string }) {
  return (
    <svg viewBox="0 0 600 100" className="w-full h-16 opacity-20" preserveAspectRatio="none">
      <motion.path
        d="M0,50 L60,50 L80,50 L90,20 L100,80 L110,10 L120,90 L130,40 L140,50 L200,50 L260,50 L280,50 L290,20 L300,80 L310,10 L320,90 L330,40 L340,50 L400,50 L460,50 L480,50 L490,20 L500,80 L510,10 L520,90 L530,40 L540,50 L600,50"
        fill="none" stroke={color} strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function PatientDashboard() {
  const { user } = useUser();
  const { data: ecgData, loading } = usePatientECG(user?.id || '', 60);
  const { data: chatMessages } = useChatMessages(user?.id || '');

  const [time, setTime] = useState(new Date());
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interactive medication state
  const [medStatus, setMedStatus] = useState([true, false, false]);
  const [dismissedTips, setDismissedTips] = useState<number[]>([]);
  const [expandedVital, setExpandedVital] = useState<string | null>(null);

  // Simulated live vitals
  const [vitals, setVitals] = useState({
    spO2: 98, hrv: 42, stress: 24, bodyTemp: 98.4,
    respRate: 16, bloodPressureSys: 118,
    bloodPressureDia: 76,
    // Guardian Pulse medical diagnostics
    heartRhythm: 92, // 0-100 sinus rhythm regularity
    tremorScore: 8,   // 0-100 tremor severity (lower = better)
    seizureRisk: 5,   // 0-100 seizure probability
    gaitStability: 88, // 0-100 gait/balance score
    panicScore: 12,   // 0-100 anxiety/panic level
  });

  const medications = useMemo(() => [
    { name: 'Metoprolol 25mg', time: '8:00 AM', color: '#4CAF78', dosage: 'Heart rate control' },
    { name: 'Lisinopril 10mg', time: '12:00 PM', color: '#D4943A', dosage: 'Blood pressure' },
    { name: 'Aspirin 81mg', time: '8:00 PM', color: '#5B9BD5', dosage: 'Blood thinner' },
  ], []);

  const healthTips = useMemo(() => [
    { tip: 'Stay hydrated — drink at least 8 glasses of water today', icon: Droplets, color: '#5B9BD5' },
    { tip: 'Keep your Guardian Pulse device charged above 20% for uninterrupted monitoring', icon: Shield, color: '#4CAF78' },
    { tip: 'Practice deep breathing for 5 minutes to lower your panic score', icon: Wind, color: '#D4B896' },
    { tip: 'Avoid sudden posture changes — your gait stability benefits from gradual movement', icon: Gauge, color: '#D4943A' },
  ], []);

  // ─── START DEMO DATA SEEDER ───
  // Writes ECG readings to Firebase so Admin can see them
  useEffect(() => {
    if (!user?.id) return;
    
    // Start seeding demo ECG data to Firebase
    startDemoDataSeeder(user.id);
    
    // Seed initial vitals snapshot
    seedDemoVitals(user.id);

    return () => {
      stopDemoDataSeeder();
    };
  }, [user?.id]);

  // ─── Sync vitals to Firebase periodically ───
  useEffect(() => {
    if (!user?.id) return;
    const syncInterval = setInterval(() => {
      syncVitalsToFirebase(user.id, vitals);
    }, 2500); // sync every 2.5s
    return () => clearInterval(syncInterval);
  }, [user?.id, vitals]);

  // ─── Continuous fluid vitals fluctuation ───
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setVitals(prev => {
        // Generate continuous random walks using target points
        const targetHeart = 82 + (Math.random() * 20 - 10);
        const targetTremor = 5 + (Math.random() * 25);
        const targetSeizure = 10 + (Math.random() * 20);
        const targetGait = 85 + (Math.random() * 15 - 5);
        const targetPanic = 15 + (Math.random() * 30);
        
        return {
          spO2: Math.min(100, Math.max(90, Math.round(prev.spO2 + (Math.random() - 0.5) * 3))),
          hrv: Math.min(65, Math.max(30, prev.hrv + Math.floor(Math.random() * 5 - 2))),
          stress: Math.min(80, Math.max(10, prev.stress + Math.floor(Math.random() * 7 - 3))),
          bodyTemp: Math.min(99.2, Math.max(97.5, +(prev.bodyTemp + (Math.random() - 0.5) * 0.2).toFixed(1))),
          respRate: Math.min(22, Math.max(12, prev.respRate + Math.floor(Math.random() * 3 - 1))),
          bloodPressureSys: Math.min(135, Math.max(105, prev.bloodPressureSys + Math.floor(Math.random() * 5 - 2))),
          bloodPressureDia: Math.min(90, Math.max(65, prev.bloodPressureDia + Math.floor(Math.random() * 3 - 1))),
          
          heartRhythm: Math.round(prev.heartRhythm + (targetHeart - prev.heartRhythm) * 0.4),
          tremorScore: Math.round(prev.tremorScore + (targetTremor - prev.tremorScore) * 0.3),
          seizureRisk: Math.round(prev.seizureRisk + (targetSeizure - prev.seizureRisk) * 0.35),
          gaitStability: Math.round(prev.gaitStability + (targetGait - prev.gaitStability) * 0.25),
          panicScore: Math.round(prev.panicScore + (targetPanic - prev.panicScore) * 0.5),
        };
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Request Support: sets needsSupport + creates alert + auto-opens chat ───
  const requestSupport = useCallback(async () => {
    if (!user) return;
    try {
      // Set needsSupport flag
      await update(ref(db, `users/${user.id}`), { needsSupport: true });
      
      // Create an alert visible in admin's Alert Management
      await createSupportAlert(user.id, 'support_request');
      
      // Send an automatic chat message
      await push(ref(db, 'chat_messages'), {
        userId: user.id, sender: 'patient',
        text: '🆘 I need medical support. Please assist.',
        timestamp: Date.now(),
      });

      // Open the chat panel
      setShowChat(true);

      toast.success('Support requested — our team has been notified!');
    } catch {
      toast.error('Failed to request support');
    }
  }, [user]);

  // ─── Emergency SOS: creates critical alert + sets needsSupport ───
  const handleEmergencySOS = useCallback(async () => {
    if (!user) return;
    try {
      // Create a critical emergency alert in admin
      await createEmergencyAlert(user.id);

      // Auto-send emergency chat message
      await push(ref(db, 'chat_messages'), {
        userId: user.id, sender: 'patient',
        text: '🚨 EMERGENCY SOS — Immediate assistance required! Patient has triggered emergency protocol.',
        timestamp: Date.now(),
      });

      setShowChat(true);
      toast.success('Emergency SOS sent — help is on the way!', { icon: '🚨', duration: 5000 });
    } catch {
      toast.error('Failed to send SOS');
    }
  }, [user]);

  // ─── Send Chat Message: auto-sets needsSupport on first message ───
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    try {
      // Ensure needsSupport is set so admin sees this in "Open Requests"
      await update(ref(db, `users/${user.id}`), { needsSupport: true });

      await push(ref(db, 'chat_messages'), {
        userId: user.id, sender: 'patient',
        text: chatInput.trim(), timestamp: Date.now()
      });
      setChatInput('');
    } catch {
      toast.error('Failed to send message');
    }
  }, [chatInput, user]);

  const toggleMed = useCallback((index: number) => {
    setMedStatus(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
    toast.success(medStatus[index] ? 'Medication unmarked' : 'Medication marked as taken ✓');
  }, [medStatus]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0C1210] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#2A3D2E] border-t-[#D4B896] rounded-full animate-spin" />
        <p className="font-poppins text-[#D4B896] text-lg">Loading your health data...</p>
        <div className="flex space-x-2">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-[#D4B896] rounded-full" style={{ animation: `typingBounce 1s ease-in-out ${i*0.15}s infinite` }} />)}
        </div>
      </div>
    );
  }

  const latest = ecgData.length > 0 ? ecgData[ecgData.length - 1] : null;
  const currentBpm = latest?.bpm || 72;
  const status = calculateBpmStatus(currentBpm);
  const sColor = status === 'critical' ? '#E05252' : status === 'warning' ? '#D4943A' : '#4CAF78';
  const statusLabel = status === 'critical' ? 'Critical' : status === 'warning' ? 'Elevated' : 'Normal';
  const stressLevel = vitals.stress < 30 ? 'Low' : vitals.stress < 55 ? 'Moderate' : 'High';
  const stressColor = vitals.stress < 30 ? '#4CAF78' : vitals.stress < 55 ? '#D4943A' : '#E05252';
  const visibleTips = healthTips.filter((_, i) => !dismissedTips.includes(i));

  const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } });

  return (
    <div className="min-h-screen bg-[#0C1210] text-white relative overflow-x-hidden">

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 px-3 py-2.5 md:px-8 md:py-4 flex items-center justify-between border-b border-[rgba(212,184,150,0.1)] bg-[rgba(12,18,16,0.92)] backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 md:h-10 md:w-10 bg-[#1C2B1E] rounded-xl flex items-center justify-center relative border border-[rgba(212,184,150,0.2)]">
            <Heart className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#4CAF78] rounded-full border-2 border-[#0C1210] live-dot" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-base md:text-xl text-[#F0E6D3]">Guardian Pulse</h1>
            <p className="text-[9px] md:text-[10px] text-[#D4B896] uppercase tracking-[0.15em] md:tracking-[0.2em] font-semibold">Patient Portal • Online</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-5">
          {status !== 'normal' && (
            <motion.div {...fadeUp()} className="hidden sm:flex items-center space-x-2 bg-[rgba(224,82,82,0.12)] border border-[rgba(224,82,82,0.3)] px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-[#E05252] rounded-full animate-ping" />
              <span className="text-[#E05252] text-xs font-bold uppercase tracking-wider">Anomaly</span>
            </motion.div>
          )}
          <div className="hidden md:block text-right">
            <p className="text-[#F0E6D3] font-mono font-semibold text-sm">{fmtTime(time)}</p>
            <p className="text-[#7A8A76] text-[10px] font-semibold uppercase tracking-wider">{fmtDate(time)}</p>
          </div>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9 md:h-10 md:w-10 border-2 border-[rgba(212,184,150,0.3)]" } }} />
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="px-3 py-5 md:px-8 md:py-8 max-w-[1480px] mx-auto space-y-5 md:space-y-6">

        {/* ─── Greeting + Emergency ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <motion.div {...fadeUp()}>
            <h2 className="font-poppins text-xl sm:text-2xl md:text-4xl font-bold text-[#F0E6D3]">
              Hello, <span className="text-[#D4B896]">{user.firstName || 'Patient'}</span> 👋
            </h2>
            <p className="text-[#9BA897] text-xs sm:text-sm md:text-base mt-1">Your health vitals are being continuously monitored in real-time.</p>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="flex gap-2 md:gap-3">
            <button onClick={requestSupport} className="flex items-center gap-1.5 md:gap-2 bg-[#1C2B1E] hover:bg-[#2A3D2E] active:scale-95 border border-[rgba(212,184,150,0.2)] hover:border-[#D4B896] text-[#D4B896] px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-xs md:text-sm font-semibold">
              <LifeBuoy className="w-4 h-4" /> Support
            </button>
            <button onClick={handleEmergencySOS} className="flex items-center gap-1.5 md:gap-2 bg-[#E05252] hover:bg-[#C33] active:scale-95 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all text-xs md:text-sm font-bold shadow-[0_4px_20px_rgba(224,82,82,0.4)]">
              <Phone className="w-4 h-4" /> Emergency SOS
            </button>
          </motion.div>
        </div>

        {/* ─── Row 2: BPM Hero + Vitals Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

          {/* BPM Hero Card */}
          <motion.div {...fadeUp(0.15)} className="lg:col-span-4 bg-[#141E18] rounded-2xl md:rounded-3xl p-5 md:p-6 border border-[rgba(212,184,150,0.1)] relative overflow-hidden flex flex-col items-center justify-center min-h-[260px] md:min-h-[320px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 md:w-64 h-48 md:h-64 rounded-full blur-[80px] opacity-20" style={{ backgroundColor: sColor }} />
            </div>
            {status === 'critical' && (
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute w-40 md:w-52 h-40 md:h-52 rounded-full border-2" style={{ borderColor: sColor }} />
            )}
            <Heart className="w-7 h-7 md:w-8 md:h-8 mb-3 animate-heartbeat" style={{ color: sColor }} />
            <div className="flex items-baseline gap-2 z-10">
              <motion.span key={currentBpm} initial={{ scale: 1.2, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-6xl md:text-8xl font-black tracking-tighter" style={{ color: sColor }}>
                {currentBpm}
              </motion.span>
              <span className="text-[#9BA897] text-lg md:text-xl font-bold">BPM</span>
            </div>
            <div className="mt-3 md:mt-4 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] border z-10"
              style={{ color: sColor, borderColor: `${sColor}50`, backgroundColor: `${sColor}15` }}>
              {statusLabel}
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-0"><ECGWaveBg color={sColor} /></div>
          </motion.div>

          {/* Vitals Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-4">
            {[
              { label: 'Blood O₂', value: `${vitals.spO2}%`, icon: Droplets, color: vitals.spO2 > 95 ? '#4CAF78' : '#D4943A', trend: vitals.spO2 > 96 ? 'up' : 'down', detail: vitals.spO2 > 95 ? 'Healthy oxygen saturation' : 'Slightly low — take deep breaths' },
              { label: 'Stress', value: stressLevel, icon: Brain, color: stressColor, sub: `${vitals.stress}/100`, detail: `Your stress score is ${vitals.stress}. ${vitals.stress < 30 ? 'Great job staying calm!' : 'Try breathing exercises.'}` },
              { label: 'HRV', value: `${vitals.hrv}ms`, icon: Activity, color: '#5B9BD5', trend: vitals.hrv > 40 ? 'up' : 'down', detail: 'Heart Rate Variability — higher is better for recovery' },
              { label: 'Body Temp', value: `${vitals.bodyTemp}°F`, icon: Thermometer, color: vitals.bodyTemp > 99 ? '#E05252' : '#D4B896', detail: vitals.bodyTemp > 99 ? 'Slightly elevated — monitor closely' : 'Normal body temperature' },
              { label: 'Resp Rate', value: `${vitals.respRate}`, icon: Wind, color: '#4CAF78', sub: 'br/min', detail: 'Normal respiratory range is 12-20 breaths/min' },
              { label: 'Blood Pressure', value: `${vitals.bloodPressureSys}/${vitals.bloodPressureDia}`, icon: Heart, color: vitals.bloodPressureSys > 130 ? '#E05252' : '#D4B896', sub: 'mmHg', detail: vitals.bloodPressureSys <= 120 ? 'Optimal blood pressure' : 'Slightly elevated' },
              { label: 'Heart Rhythm', value: `${vitals.heartRhythm}%`, icon: Waves, color: vitals.heartRhythm > 85 ? '#4CAF78' : '#D4943A', sub: 'regularity', detail: vitals.heartRhythm > 85 ? 'Normal sinus rhythm detected' : 'Minor irregularity — under observation' },
              { label: 'Tremor Index', value: `${vitals.tremorScore}`, icon: Activity, color: vitals.tremorScore < 15 ? '#4CAF78' : '#E05252', sub: '/100', detail: vitals.tremorScore < 15 ? 'Minimal tremor activity' : 'Elevated tremor detected — alerting care team' },
            ].map((card, i) => {
              const isExpanded = expandedVital === card.label;
              return (
                <motion.button key={card.label}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  onClick={() => setExpandedVital(isExpanded ? null : card.label)}
                  className={`bg-[#141E18] rounded-xl md:rounded-2xl p-3 md:p-4 border transition-all group relative overflow-hidden text-left w-full ${isExpanded ? 'border-[rgba(212,184,150,0.35)] shadow-[0_0_20px_rgba(212,184,150,0.08)]' : 'border-[rgba(212,184,150,0.08)] hover:border-[rgba(212,184,150,0.25)]'}`}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                      <card.icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: card.color }} />
                    </div>
                    {card.trend && (
                      card.trend === 'up'
                        ? <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#4CAF78]" />
                        : <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E05252]" />
                    )}
                  </div>
                  <motion.p key={card.value} initial={{ scale: 1.05 }} animate={{ scale: 1 }}
                    className="font-mono font-bold text-base md:text-xl text-[#F0E6D3] leading-none">
                    {card.value}
                  </motion.p>
                  {card.sub && <p className="text-[9px] md:text-[10px] text-[#7A8A76] mt-0.5 font-medium">{card.sub}</p>}
                  <p className="text-[9px] md:text-[10px] text-[#9BA897] uppercase tracking-[0.12em] md:tracking-[0.15em] font-semibold mt-1.5 md:mt-2">{card.label}</p>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <p className="text-[11px] text-[#C0B8A9] mt-2 pt-2 border-t border-[rgba(212,184,150,0.1)] leading-relaxed">{card.detail}</p>
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
          <motion.div {...fadeUp(0.3)} className="lg:col-span-7 bg-[#141E18] rounded-2xl md:rounded-3xl p-4 md:p-6 border border-[rgba(212,184,150,0.1)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 bg-[rgba(91,155,213,0.12)] rounded-lg">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-[#5B9BD5]" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-sm md:text-base text-[#F0E6D3]">Live ECG Telemetry</h3>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">Real-time heart monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 bg-[#1C2B1E] px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-[rgba(76,175,120,0.3)]">
                <span className="w-2 h-2 rounded-full bg-[#4CAF78] live-dot shadow-[0_0_6px_#4CAF78]" />
                <span className="text-[#4CAF78] text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider">Live</span>
              </div>
            </div>
            <div className="h-[180px] md:h-[240px] rounded-xl md:rounded-2xl bg-[#0C1210] border border-[rgba(91,155,213,0.1)] p-1.5 md:p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ecgData}>
                  <defs>
                    <linearGradient id="ecgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sColor} stopOpacity={0.3}/>
                      <stop offset="100%" stopColor={sColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin - 15', 'dataMax + 15']} hide />
                  <Tooltip
                    contentStyle={{ background: '#1C2B1E', border: '1px solid rgba(212,184,150,0.3)', borderRadius: '12px', color: '#F0E6D3', fontSize: '12px' }}
                    itemStyle={{ color: '#D4B896', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="bpm" stroke={sColor} strokeWidth={2.5} fill="url(#ecgGrad)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
            {/* Stress Monitor */}
            <motion.div {...fadeUp(0.35)} className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]">
              <div className="flex items-center gap-2 mb-3 md:mb-4 w-full">
                <Brain className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">Stress Monitor</h4>
              </div>
              <div className="w-full bg-[#0C1210] rounded-full h-3 md:h-4 overflow-hidden border border-[rgba(212,184,150,0.08)]">
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${vitals.stress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} style={{ background: `linear-gradient(90deg, #4CAF78, ${stressColor})` }} />
              </div>
              <div className="flex items-center justify-between w-full mt-2 md:mt-3">
                <span className="text-[10px] md:text-xs text-[#7A8A76]">0</span>
                <span className="font-mono font-bold text-base md:text-lg" style={{ color: stressColor }}>{vitals.stress}</span>
                <span className="text-[10px] md:text-xs text-[#7A8A76]">100</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider" style={{ color: stressColor }}>{stressLevel} Stress</span>
              </div>
            </motion.div>

            {/* Blood Pressure */}
            <motion.div {...fadeUp(0.4)} className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Waves className="w-4 h-4 md:w-5 md:h-5 text-[#E05252]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">Blood Pressure</h4>
              </div>
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div className="text-center">
                  <motion.p key={vitals.bloodPressureSys} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="font-mono text-2xl md:text-3xl font-bold text-[#F0E6D3]">
                    {vitals.bloodPressureSys}
                  </motion.p>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">Systolic</p>
                </div>
                <span className="text-xl md:text-2xl text-[#5C6B58] font-light">/</span>
                <div className="text-center">
                  <motion.p key={vitals.bloodPressureDia} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="font-mono text-2xl md:text-3xl font-bold text-[#F0E6D3]">
                    {vitals.bloodPressureDia}
                  </motion.p>
                  <p className="text-[9px] md:text-[10px] text-[#7A8A76] uppercase tracking-wider">Diastolic</p>
                </div>
                <span className="text-xs md:text-sm text-[#7A8A76] ml-1 md:ml-2 font-medium">mmHg</span>
              </div>
              <div className="mt-2 md:mt-3 text-center">
                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${vitals.bloodPressureSys <= 120 ? 'text-[#4CAF78] border-[#4CAF78]/30 bg-[#4CAF78]/10' : vitals.bloodPressureSys <= 130 ? 'text-[#D4943A] border-[#D4943A]/30 bg-[#D4943A]/10' : 'text-[#E05252] border-[#E05252]/30 bg-[#E05252]/10'}`}>
                  {vitals.bloodPressureSys <= 120 ? 'Normal' : vitals.bloodPressureSys <= 130 ? 'Elevated' : 'High'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Row 4: Medication + Health Tips + Activity ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Medication Reminders */}
          <motion.div {...fadeUp(0.45)} className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)]">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">Medication Schedule</h4>
              </div>
              <span className="text-[9px] md:text-[10px] text-[#7A8A76] font-mono">{medStatus.filter(Boolean).length}/{medications.length} taken</span>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              {medications.map((med, i) => (
                <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => toggleMed(i)}
                  className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl border transition-all w-full text-left cursor-pointer ${medStatus[i] ? 'bg-[rgba(76,175,120,0.06)] border-[rgba(76,175,120,0.25)]' : 'bg-[#0C1210] border-[rgba(212,184,150,0.08)] hover:border-[rgba(212,184,150,0.2)]'}`}>
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <motion.div animate={medStatus[i] ? { backgroundColor: 'rgba(76,175,120,0.2)' } : { backgroundColor: 'rgba(212,184,150,0.08)' }}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center">
                      {medStatus[i] ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#4CAF78]" /> : <span className="text-[#D4B896] text-xs">•</span>}
                    </motion.div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-[#F0E6D3]">{med.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#7A8A76]" />
                        <p className="text-[9px] md:text-[10px] text-[#7A8A76]">{med.time} · {med.dosage}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 md:py-1 rounded-full shrink-0 ${medStatus[i] ? 'text-[#4CAF78] bg-[#4CAF78]/10' : 'text-[#D4943A] bg-[#D4943A]/10'}`}>
                    {medStatus[i] ? 'Taken' : 'Pending'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Health Tips */}
          <motion.div {...fadeUp(0.5)} className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)] hover:border-[rgba(212,184,150,0.2)] transition-colors">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#4CAF78]" />
                </motion.div>
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">Health Tips</h4>
              </div>
              <motion.span key={visibleTips.length} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                className="text-[9px] md:text-[10px] text-[#7A8A76] bg-[#0C1210] px-2 py-0.5 rounded-full border border-[rgba(212,184,150,0.08)]">
                {visibleTips.length} tips
              </motion.span>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              <AnimatePresence mode="popLayout">
                {visibleTips.length === 0 ? (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Check className="w-8 h-8 text-[#4CAF78] mx-auto mb-2" />
                    </motion.div>
                    <p className="text-sm text-[#9BA897] font-medium">All tips reviewed! 🎉</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setDismissedTips([])}
                      className="text-xs text-[#D4B896] mt-3 px-4 py-1.5 rounded-full border border-[rgba(212,184,150,0.2)] hover:bg-[rgba(212,184,150,0.08)] transition-all">
                      ↺ Show again
                    </motion.button>
                  </motion.div>
                ) : (
                  visibleTips.map((item, idx) => {
                    const originalIndex = healthTips.indexOf(item);
                    return (
                      <motion.div key={originalIndex}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="flex items-start gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-xl bg-[#0C1210] border border-[rgba(212,184,150,0.06)] hover:border-[rgba(212,184,150,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all group cursor-default relative overflow-hidden">
                        {/* Accent line */}
                        <div className="absolute top-0 left-0 bottom-0 w-[2px] rounded-full" style={{ backgroundColor: item.color }} />
                        <motion.div whileHover={{ rotate: 10 }}
                          className="p-1.5 md:p-2 rounded-lg shrink-0 ml-1" style={{ backgroundColor: `${item.color}15` }}>
                          <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: item.color }} />
                        </motion.div>
                        <p className="text-xs md:text-sm text-[#C0B8A9] leading-relaxed flex-1">{item.tip}</p>
                        <motion.button
                          whileHover={{ scale: 1.2, backgroundColor: 'rgba(224,82,82,0.15)' }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => {
                            setDismissedTips(prev => [...prev, originalIndex]);
                            toast.success('Tip dismissed', { icon: '💡' });
                          }}
                          className="p-1 md:p-1.5 rounded-md bg-[rgba(212,184,150,0.05)] hover:bg-[rgba(212,184,150,0.12)] transition-all shrink-0">
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
          <motion.div {...fadeUp(0.55)} className="bg-[#141E18] rounded-xl md:rounded-2xl p-4 md:p-5 border border-[rgba(212,184,150,0.1)] hover:border-[rgba(212,184,150,0.2)] transition-colors">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 5 }}>
                  <Shield className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                </motion.div>
                <h4 className="font-poppins font-semibold text-xs md:text-sm text-[#F0E6D3]">Diagnostic Reports</h4>
              </div>
              <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-[rgba(76,175,120,0.1)] text-[#4CAF78] border border-[#4CAF78]/30 rounded-full font-bold uppercase tracking-wider">Live</span>
            </div>
            <DiagnosticReportsList vitals={vitals} />
          </motion.div>
        </div>

        {/* ─── Row 5: Chat Support ─── */}
        <motion.div {...fadeUp(0.6)} className="bg-[#141E18] rounded-2xl md:rounded-3xl border border-[rgba(212,184,150,0.1)] overflow-hidden hover:border-[rgba(212,184,150,0.2)] transition-colors">
          {(() => {
            // Count unread messages from support (not from patient themselves)
            const unreadCount = chatMessages.filter(m => m.sender === 'support' || m.sender === 'system' || m.sender === 'ai').length;

            // Group messages into sessions (split by system "resolved" messages)
            const sessions: { messages: typeof chatMessages; resolved: boolean }[] = [];
            let currentSession: typeof chatMessages = [];
            chatMessages.forEach(m => {
              currentSession.push(m);
              if (m.sender === 'system' && m.text.toLowerCase().includes('resolved')) {
                sessions.push({ messages: [...currentSession], resolved: true });
                currentSession = [];
              }
            });
            if (currentSession.length > 0) {
              sessions.push({ messages: currentSession, resolved: false });
            }
            const hasResolvedSessions = sessions.some(s => s.resolved);
            const latestIsResolved = sessions.length > 0 && sessions[sessions.length - 1].resolved;

            return (
              <>
                <button onClick={() => setShowChat(!showChat)}
                  className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(0,0,0,0.3)] transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-[rgba(212,184,150,0.12)] rounded-full flex items-center justify-center relative">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-[#D4B896]" />
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-4.5 h-4.5 md:w-5 md:h-5 bg-[#E05252] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(224,82,82,0.5)]">
                          <span className="text-[8px] md:text-[9px] text-white font-bold">{Math.min(unreadCount, 9)}{unreadCount > 9 ? '+' : ''}</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="text-left">
                      <h3 className="font-poppins font-semibold text-[#F0E6D3] text-xs md:text-sm">Contact Medical Support</h3>
                      <p className="text-[9px] md:text-[10px] text-[#7A8A76]">
                        {latestIsResolved ? 'Previous session resolved — start new chat' : unreadCount > 0 ? `${unreadCount} new response${unreadCount > 1 ? 's' : ''} from support` : 'Chat with Guardian Pulse admin team'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasResolvedSessions && (
                      <span className="text-[8px] md:text-[9px] px-2 py-0.5 bg-[rgba(76,175,120,0.1)] text-[#4CAF78] border border-[#4CAF78]/30 rounded-full font-bold uppercase tracking-wider hidden sm:inline">
                        History
                      </span>
                    )}
                    <ChevronUp className={`w-4 h-4 md:w-5 md:h-5 text-[#9BA897] transition-transform ${showChat ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {showChat && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      className="border-t border-[rgba(212,184,150,0.08)] overflow-hidden">
                      <div className="h-[280px] md:h-[380px] overflow-y-auto p-4 md:p-5 space-y-2.5 md:space-y-3">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                              <div className="bg-[rgba(212,184,150,0.05)] p-4 md:p-5 rounded-full border border-[rgba(212,184,150,0.1)]">
                                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-[#7A8A76]" />
                              </div>
                            </motion.div>
                            <p className="text-[#9BA897] text-xs md:text-sm font-medium">No messages yet.</p>
                            <p className="text-[#7A8A76] text-[10px] md:text-xs max-w-xs">Start a conversation to get medical support from our team.</p>
                          </div>
                        ) : (
                          <>
                            {sessions.map((session, sIdx) => (
                              <div key={sIdx}>
                                {/* Session divider for resolved sessions (except the first) */}
                                {sIdx > 0 && (
                                  <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-[rgba(212,184,150,0.08)]" />
                                    <span className="text-[9px] text-[#5C6B58] font-medium uppercase tracking-wider">
                                      Session {sIdx + 1}
                                    </span>
                                    <div className="flex-1 h-px bg-[rgba(212,184,150,0.08)]" />
                                  </div>
                                )}

                                {session.messages.map((m, mIdx) => {
                                  const isMe = m.sender === 'patient';
                                  const isSystem = m.sender === 'system' || m.sender === 'ai';

                                  if (isSystem) {
                                    const isResolved = m.text.toLowerCase().includes('resolved');
                                    return (
                                      <motion.div key={m.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: mIdx * 0.02 }}
                                        className="flex justify-center my-3">
                                        <div className={`flex items-center gap-1.5 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-medium border ${
                                          isResolved
                                            ? 'bg-[rgba(76,175,120,0.08)] border-[rgba(76,175,120,0.2)] text-[#4CAF78]'
                                            : 'bg-[rgba(0,0,0,0.3)] border-[rgba(212,184,150,0.1)] text-[#9BA897]'
                                        }`}>
                                          {isResolved && <Check className="w-3 h-3" />}
                                          {m.sender === 'ai' && <Zap className="w-3 h-3 text-[#D4B896]" />}
                                          <span>{m.text}</span>
                                        </div>
                                      </motion.div>
                                    );
                                  }

                                  return (
                                    <motion.div key={m.id}
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ delay: mIdx * 0.02, duration: 0.2 }}
                                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md ${
                                        isMe
                                          ? 'bg-[rgba(212,184,150,0.12)] text-[#F0E6D3] rounded-tr-sm border border-[rgba(212,184,150,0.2)]'
                                          : 'bg-[#1C2B1E] text-[#F0E6D3] rounded-tl-sm border border-[#2A3D2E]'
                                      }`}>
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${isMe ? 'text-[#D4B896]' : 'text-[#4CAF78]'}`}>
                                            {isMe ? 'You' : 'Support'}
                                          </span>
                                        </div>
                                        <p className="text-xs md:text-sm leading-relaxed">{m.text}</p>
                                        <p className={`text-[9px] md:text-[10px] mt-1.5 text-right font-medium ${isMe ? 'text-[#D4B896]/60' : 'text-[#7A8A76]'}`}>
                                          {fmtMsgTime(m.timestamp)}
                                        </p>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            ))}

                            {/* Show "New Conversation" prompt after resolution */}
                            {latestIsResolved && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center gap-2 py-4">
                                <div className="w-10 h-px bg-[rgba(212,184,150,0.1)]" />
                                <p className="text-[10px] md:text-xs text-[#5C6B58]">Session resolved by admin</p>
                                <p className="text-[10px] md:text-xs text-[#9BA897]">Type below to start a new conversation</p>
                              </motion.div>
                            )}
                          </>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div className="p-3 md:p-4 bg-[rgba(0,0,0,0.15)] border-t border-[rgba(212,184,150,0.08)]">
                        <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
                          <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                            className="flex-1 bg-[#0C1210] border border-[rgba(212,184,150,0.15)] focus:border-[#D4B896] text-[#F0E6D3] placeholder-[#5C6B58] rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none transition-colors text-xs md:text-sm"
                            placeholder={latestIsResolved ? 'Start a new conversation...' : 'Type your concern here...'} />
                          <motion.button type="submit" disabled={!chatInput.trim()}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                            className="bg-[#D4B896] hover:bg-[#C4A882] disabled:opacity-40 disabled:cursor-not-allowed text-[#0C1210] p-2.5 md:p-3 rounded-xl transition-all font-bold shadow-[0_0_15px_rgba(212,184,150,0.2)]">
                            <Send className="w-4 h-4 md:w-5 md:h-5" />
                          </motion.button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            );
          })()}
        </motion.div>

      </main>
    </div>
  );
}
