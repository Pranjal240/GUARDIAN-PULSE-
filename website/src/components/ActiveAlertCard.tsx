'use client';

import { motion } from 'framer-motion';
import { Patient, Alert, classifyAlertType } from '@/lib/firebase-hooks';
import { formatDistanceToNow, format } from 'date-fns';
import { CheckCircle, Phone, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface Props {
  alert: Alert;
  patient?: Patient;
}

export default function ActiveAlertCard({ alert, patient }: Props) {
  const tInfo = classifyAlertType(alert.type);
  const timeStr = formatDistanceToNow(alert.createdAt, { addSuffix: true });
  
  const handleResolve = async () => {
    try {
      await update(ref(db, `alerts/${alert.id}`), { status: 'resolved' });
      toast.success('Alert marked as resolved');
    } catch (e) {
      toast.error('Failed to resolve alert');
    }
  };

  const isResolved = alert.status === 'resolved';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      className={`relative bg-[#111811] rounded-2xl p-6 border-l-4 shadow-[0_4px_24px_rgba(0,0,0,0.6)] ${
        !isResolved ? 'animate-[criticalCardPulse_2.5s_ease-in-out_infinite]' : 'opacity-70'
      }`}
      style={{ borderLeftColor: isResolved ? '#7A8A76' : tInfo.color }}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        
        {/* Left Side: Summary & Actions */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center space-x-3">
             <div className="p-2 rounded-xl" style={{ backgroundColor: `${isResolved ? '#7A8A76' : tInfo.color}25` }}>
               {/* Icon placeholder for simplicity */}
               <div className="w-6 h-6" style={{ color: isResolved ? '#7A8A76' : tInfo.color }}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                 </svg>
               </div>
             </div>
             <div>
               <h3 className="font-poppins font-bold text-xl tracking-tight" style={{ color: isResolved ? '#9BA897' : tInfo.color }}>
                 {tInfo.label}
               </h3>
               <p className="text-[#9BA897] text-sm">
                 Triggered {timeStr} ({format(alert.createdAt, 'HH:mm:ss')})
               </p>
             </div>
          </div>

          <div className="bg-[#1C2B1E] border border-[rgba(212,184,150,0.1)] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-[#2A3D2E] rounded-full flex items-center justify-center text-[#D4B896]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-poppins font-semibold text-[#F0E6D3]">
                  {patient?.name || 'Unknown'}
                </p>
                <p className="text-[#7A8A76] text-xs uppercase tracking-widest">{patient?.phone || 'No phone record'}</p>
              </div>
            </div>
          </div>

          {!isResolved && (
            <div className="flex items-center space-x-3 pt-2">
               <button 
                 onClick={handleResolve}
                 className="flex-1 bg-[#4A6741] hover:bg-[#5B7F52] text-[#F2E8D9] py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 shadow-lg"
               >
                 <CheckCircle className="w-5 h-5" />
                 <span>Mark Safe / Resolve</span>
               </button>
               {patient?.phone && (
                 <a href={`tel:${patient?.phone ?? ''}`} className="p-3 bg-[rgba(212,184,150,0.1)] hover:bg-[rgba(212,184,150,0.2)] text-[#D4B896] rounded-xl transition-colors">
                   <Phone className="w-5 h-5" />
                 </a>
               )}
               <Link href={`/dashboard/ecg?patient=${alert.userId}`} className="p-3 border border-[rgba(212,184,150,0.3)] hover:border-[#D4B896] text-[#D4B896] rounded-xl transition-colors">
                 <ArrowRight className="w-5 h-5" />
               </Link>
            </div>
          )}
        </div>

        {/* Right Side: Timeline */}
        <div className="md:w-64 bg-[#1C2B1E] rounded-xl p-5 border border-[rgba(212,184,150,0.08)] flex flex-col justify-center">
           <h4 className="text-[#9BA897] text-xs font-semibold uppercase tracking-widest mb-4">Event Timeline</h4>
           <div className="relative pl-4 space-y-6">
             <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-[#2A3D2E]"></div>
             
             <div className="relative">
               <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-[#E05252] shadow-[0_0_8px_#E05252]"></div>
               <p className="font-medium text-[#F0E6D3] text-sm">Alert Triggered</p>
               <p className="text-xs text-[#7A8A76]">{format(alert.createdAt, 'HH:mm:ss')}</p>
             </div>
             
             <div className="relative">
               <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-[#D4B896]"></div>
               <p className="font-medium text-[#F0E6D3] text-sm">System Processed</p>
               <p className="text-xs text-[#7A8A76]">{format(alert.createdAt + 2000, 'HH:mm:ss')}</p>
             </div>
             
             {isResolved ? (
               <div className="relative">
                 <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-[#4CAF78]"></div>
                 <p className="font-medium text-[#4CAF78] text-sm">Resolved</p>
               </div>
             ) : (
               <div className="relative">
                 <div className="absolute -left-[1.35rem] w-3 h-3 rounded-full bg-[#2A3D2E] border border-[#D4B896] animate-pulse"></div>
                 <p className="font-medium text-[#D4B896] text-sm italic">Pending Resolution</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}
