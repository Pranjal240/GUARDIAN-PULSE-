'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { usePatientECG, calculateBpmStatus } from '@/lib/firebase-hooks';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Phone, LifeBuoy } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function PatientDashboard() {
  const { user } = useUser();
  const { data: ecgData, loading } = usePatientECG(user?.id || '', 60);

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
      <div className="min-h-screen bg-[#141A14] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#2A3D2E] border-t-[#D4B896] rounded-full animate-spin"></div>
        <p className="font-poppins text-[#9BA897]">Loading your health data...</p>
      </div>
    );
  }

  const latest = ecgData.length > 0 ? ecgData[ecgData.length - 1] : null;
  const currentBpm = latest?.bpm || 72;
  const status = calculateBpmStatus(currentBpm);
  
  const sColor = status === 'critical' ? '#E05252' : status === 'warning' ? '#D4943A' : '#4CAF78';

  return (
    <div className="min-h-screen bg-[#141A14] font-inter text-[#F0E6D3] flex flex-col">
      
      {/* HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[rgba(212,184,150,0.08)] bg-[#1A2620]">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-[#2A3D2E] rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-[#D4B896]" />
          </div>
          <div>
            <h1 className="font-poppins font-bold text-xl tracking-tight text-[#F0E6D3]">Guardian Pulse</h1>
            <p className="text-xs text-[#9BA897] uppercase tracking-wider">Patient Portal</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           {status !== 'normal' && (
             <div className="hidden md:flex items-center space-x-2 bg-[#E05252]/10 border border-[#E05252]/30 px-3 py-1.5 rounded-full">
               <span className="w-2 h-2 bg-[#E05252] rounded-full animate-ping"></span>
               <span className="text-[#E05252] text-sm font-semibold uppercase">ECG Anomaly Detected</span>
             </div>
           )}
           <UserButton appearance={{ elements: { userButtonAvatarBox: "h-10 w-10 border-2 border-[rgba(212,184,150,0.2)]" } }} />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-12 gap-8 lg:gap-16 items-center justify-center max-w-7xl mx-auto w-full">
         
         {/* LEFT -> BIG PULSE CIRCLE */}
         <div className="flex-1 flex flex-col items-center justify-center">
            <div className="mb-12 text-center space-y-2">
              <h2 className="font-poppins text-3xl md:text-4xl font-semibold">Hello, {user.firstName} {user.lastName}</h2>
              <p className="text-[#9BA897] md:text-lg tracking-wide">Your heart is being continuously monitored.</p>
            </div>

            <div className="relative flex items-center justify-center">
               <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute inset-0 rounded-full blur-3xl opacity-20"
                  style={{ backgroundColor: sColor }}
               />
               
               <motion.div 
                 animate={status === 'critical' ? { scale: [1, 1.05, 1], boxShadow: [`0 0 0 0 ${sColor}80`, `0 0 0 40px ${sColor}00`] } : {}}
                 transition={{ duration: 1, repeat: Infinity }}
                 className="relative w-64 h-64 md:w-80 md:h-80 rounded-full flex flex-col items-center justify-center bg-[#1A2620] border-4 shadow-2xl z-10"
                 style={{ borderColor: sColor }}
               >
                  <Heart className="w-8 h-8 mb-2 opacity-80 animate-bounce" style={{ color: sColor }} />
                  <div className="flex items-baseline space-x-2">
                    <span className="font-mono-data text-7xl md:text-8xl font-bold tracking-tighter" style={{ color: sColor }}>
                      {currentBpm}
                    </span>
                    <span className="text-[#9BA897] font-semibold text-xl">BPM</span>
                  </div>
                  <span className={`mt-4 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest border`}
                        style={{ color: sColor, borderColor: `${sColor}50`, backgroundColor: `${sColor}15` }}>
                    {status}
                  </span>
               </motion.div>
            </div>
         </div>

         {/* RIGHT -> CHART & ACTIONS */}
         <div className="flex-1 w-full max-w-md space-y-6">
            
            <div className="card-style p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-poppins font-medium text-lg">Live ECG Trace</h3>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF78] live-dot"></span>
                  <span className="text-[#7A8A76] text-xs">Syncing...</span>
                </div>
              </div>
              
              <div className="h-48 border border-[#2A3D2E] rounded-xl p-2 bg-[#111811]">
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
               <button 
                 onClick={requestSupport}
                 className="bg-[#2A3D2E] hover:bg-[#3D5738] border border-[rgba(212,184,150,0.15)] text-[#F0E6D3] rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 transition-all hover:shadow-[0_4px_20px_rgba(212,184,150,0.1)] group"
               >
                  <LifeBuoy className="w-8 h-8 text-[#9BA897] group-hover:text-[#D4B896] transition-colors" />
                  <span className="font-poppins font-medium text-center">Request<br/>Support</span>
               </button>
               
               <button className="bg-[#E05252] hover:bg-[#c44444] text-white rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 shadow-[0_4px_24px_rgba(224,82,82,0.4)] transition-all hover:shadow-[0_8px_32px_rgba(224,82,82,0.6)]">
                  <Phone className="w-8 h-8" />
                  <span className="font-poppins font-medium text-center">Emergency<br/>Call</span>
               </button>
            </div>

         </div>

      </main>
    </div>
  );
}
