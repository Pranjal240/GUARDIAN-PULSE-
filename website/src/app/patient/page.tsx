'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { usePatientECG, calculateBpmStatus } from '@/lib/firebase-hooks';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Heart, Phone, LifeBuoy, Shield, Activity } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function PatientDashboard() {
  const { user } = useUser();
  const { data: ecgData, loading } = usePatientECG(user?.id || '', 60);
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const requestSupport = async () => {
    if (!user) return;
    try {
      await update(ref(db, `users/${user.id}`), { needsSupport: true });
      toast.success('Support requested. A medical professional will contact you shortly.');
    } catch (err) {
      toast.error('Failed to request support');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#141A14] flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
        <div className="ambient-mesh"></div>
        <div className="w-16 h-16 border-4 border-[#2A3D2E] border-t-[#D4B896] rounded-full animate-spin"></div>
        <p className="font-poppins text-[#9BA897]">Loading your health data...</p>
        <div className="flex space-x-2 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-[#D4B896] rounded-full" style={{ animation: `typingBounce 1s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  const latest = ecgData.length > 0 ? ecgData[ecgData.length - 1] : null;
  const currentBpm = latest?.bpm || 72;
  const status = calculateBpmStatus(currentBpm);
  
  const sColor = status === 'critical' ? '#E05252' : status === 'warning' ? '#D4943A' : '#4CAF78';
  const statusLabel = status === 'critical' ? 'Critical' : status === 'warning' ? 'Elevated' : 'Normal';

  return (
    <div className="min-h-screen bg-[#141A14] font-inter text-[#F0E6D3] flex flex-col relative overflow-hidden">
      {/* Ambient background */}
      <div className="ambient-mesh"></div>
      
      {/* HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[rgba(212,184,150,0.08)] bg-[rgba(26,38,32,0.85)] backdrop-blur-xl relative z-20">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-[#2A3D2E] rounded-xl flex items-center justify-center relative">
            <Heart className="w-6 h-6 text-[#D4B896]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4CAF78] rounded-full border-2 border-[#1A2620] live-dot"></div>
          </div>
          <div>
            <h1 className="font-poppins font-bold text-xl tracking-tight text-[#F0E6D3]">Guardian Pulse</h1>
            <p className="text-xs text-[#9BA897] uppercase tracking-wider">Patient Portal</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           {status !== 'normal' && (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="hidden md:flex items-center space-x-2 bg-[#E05252]/10 border border-[#E05252]/30 px-3 py-1.5 rounded-full"
             >
               <span className="w-2 h-2 bg-[#E05252] rounded-full animate-ping"></span>
               <span className="text-[#E05252] text-sm font-semibold uppercase">ECG Anomaly Detected</span>
             </motion.div>
           )}
           <div className="hidden md:block text-right">
             <p className="text-[#D4B896] font-mono text-sm">{format(time, 'h:mm:ss a')}</p>
             <p className="text-[#5C6B58] text-xs">{format(time, 'EEEE, MMM d')}</p>
           </div>
           <UserButton appearance={{ elements: { userButtonAvatarBox: "h-10 w-10 border-2 border-[rgba(212,184,150,0.2)]" } }} />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-12 gap-8 lg:gap-16 items-center justify-center max-w-7xl mx-auto w-full relative z-10">
         
         {/* LEFT -> BIG PULSE CIRCLE */}
         <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center space-y-2"
            >
              <h2 className="font-poppins text-3xl md:text-4xl font-semibold">Hello, {user.firstName} {user.lastName}</h2>
              <p className="text-[#9BA897] md:text-lg tracking-wide">Your heart is being continuously monitored.</p>
            </motion.div>

            <div className="relative flex items-center justify-center">
               {/* Outer ambient glow */}
               <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.15 }}
                  transition={{ duration: 1 }}
                  className="absolute w-[340px] h-[340px] md:w-[420px] md:h-[420px] rounded-full blur-3xl"
                  style={{ backgroundColor: sColor }}
               />

               {/* Pulsing ring */}
               {status === 'critical' && (
                 <motion.div
                   animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                   className="absolute w-72 h-72 md:w-88 md:h-88 rounded-full border-2"
                   style={{ borderColor: sColor }}
                 />
               )}
               
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                 className="relative w-64 h-64 md:w-80 md:h-80 rounded-full flex flex-col items-center justify-center bg-[rgba(26,38,32,0.9)] backdrop-blur-sm border-4 shadow-2xl z-10"
                 style={{ borderColor: sColor }}
               >
                  <Heart className="w-8 h-8 mb-2 opacity-80 animate-heartbeat" style={{ color: sColor }} />
                  <div className="flex items-baseline space-x-2">
                    <motion.span 
                      key={currentBpm}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-mono text-7xl md:text-8xl font-bold tracking-tighter" 
                      style={{ color: sColor }}
                    >
                      {currentBpm}
                    </motion.span>
                    <span className="text-[#9BA897] font-semibold text-xl">BPM</span>
                  </div>
                  <span className={`mt-4 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border`}
                        style={{ color: sColor, borderColor: `${sColor}50`, backgroundColor: `${sColor}15` }}>
                    {statusLabel}
                  </span>
               </motion.div>
            </div>

            {/* Mini stats row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-6 mt-10"
            >
              {[
                { label: 'HRV', value: '42ms', icon: Activity, color: '#5B9BD5' },
                { label: 'SpO2', value: '98%', icon: Shield, color: '#4CAF78' },
                { label: 'Stress', value: 'Low', icon: Heart, color: '#D4B896' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-2 bg-[rgba(28,43,30,0.6)] backdrop-blur-sm px-4 py-2 rounded-xl border border-[rgba(212,184,150,0.08)]">
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  <div>
                    <p className="text-[#7A8A76] text-[10px] uppercase tracking-wider">{stat.label}</p>
                    <p className="font-mono font-bold text-sm text-[#F0E6D3]">{stat.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
         </div>

         {/* RIGHT -> CHART & ACTIONS */}
         <motion.div 
           initial={{ opacity: 0, x: 30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.6, delay: 0.3 }}
           className="flex-1 w-full max-w-md space-y-6"
         >
            
            <div className="card-glass p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-poppins font-medium text-lg">Live ECG Trace</h3>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF78] live-dot"></span>
                  <span className="text-[#7A8A76] text-xs font-mono">Syncing...</span>
                </div>
              </div>
              
              <div className="h-48 border border-[#2A3D2E] rounded-xl p-2 bg-[rgba(17,24,17,0.6)]">
                 <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
                 <ResponsiveContainer width="100%" height={240} minWidth={100}>
                   <LineChart data={ecgData}>
                     <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                     <Tooltip 
                        contentStyle={{ background: '#1C2B1E', border: '1px solid #D4B896', borderRadius: '12px', color: '#F0E6D3' }}
                        itemStyle={{ color: '#D4B896', fontFamily: 'JetBrains Mono' }}
                     />
                     <Line 
                       type="monotone" 
                       dataKey="bpm" 
                       stroke={sColor} 
                       strokeWidth={3} 
                       dot={false}
                       isAnimationActive={false}
                     />
                   </LineChart>
                 </ResponsiveContainer>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <motion.button 
                 whileHover={{ scale: 1.03, y: -2 }}
                 whileTap={{ scale: 0.97 }}
                 onClick={requestSupport}
                 className="bg-[#2A3D2E] hover:bg-[#3D5738] border border-[rgba(212,184,150,0.15)] text-[#F0E6D3] rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 transition-all hover:shadow-[0_4px_20px_rgba(212,184,150,0.1)] group"
               >
                  <LifeBuoy className="w-8 h-8 text-[#9BA897] group-hover:text-[#D4B896] transition-colors" />
                  <span className="font-poppins font-medium text-center">Request<br/>Support</span>
               </motion.button>
               
               <motion.button 
                 whileHover={{ scale: 1.03, y: -2 }}
                 whileTap={{ scale: 0.97 }}
                 className="bg-[#E05252] hover:bg-[#c44444] text-white rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 shadow-[0_4px_24px_rgba(224,82,82,0.4)] transition-all hover:shadow-[0_8px_32px_rgba(224,82,82,0.6)]"
               >
                  <Phone className="w-8 h-8" />
                  <span className="font-poppins font-medium text-center">Emergency<br/>Call</span>
               </motion.button>
            </div>

         </motion.div>

      </main>
    </div>
  );
}

function format(date: Date, formatStr: string): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (formatStr === 'h:mm:ss a') {
    return `${h}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
  }
  if (formatStr === 'EEEE, MMM d') {
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }
  return date.toLocaleString();
}
