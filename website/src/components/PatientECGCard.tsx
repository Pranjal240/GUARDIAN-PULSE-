'use client';

import { motion } from 'framer-motion';
import { Patient, EcgReading, calculateBpmStatus, calculateHRV } from '@/lib/firebase-hooks';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface Props {
  patient: Patient;
  ecgData: EcgReading[];
  onClick: () => void;
}

export default function PatientECGCard({ patient, ecgData, onClick }: Props) {
  const latest = ecgData.length > 0 ? ecgData[ecgData.length - 1] : null;
  const currentBpm = latest?.bpm || 0;
  
  const status = currentBpm > 0 ? calculateBpmStatus(currentBpm) : 'normal';
  const isCritical = status === 'critical';
  const isWarning = status === 'warning';
  
  // Colors
  const sColor = isCritical ? '#E05252' : isWarning ? '#D4943A' : '#4CAF78';
  
  const hrv = ecgData.length > 0 ? Math.round(calculateHRV(ecgData.map(d => d.rrIntervals?.[d.rrIntervals.length - 1] || 800))) : '--';
  const updatedAgo = latest ? Math.round((Date.now() - latest.timestamp) / 1000) : '--';
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`card-style p-4 cursor-pointer relative overflow-hidden ${
        isCritical ? 'animate-critical border-[#E05252]' : ''
      }`}
    >
      {/* Top Row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full font-poppins font-bold text-lg flex items-center justify-center"
               style={{ backgroundColor: `${sColor}20`, color: sColor }}>
            {(patient.name ?? '').split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="font-poppins font-medium text-[#F0E6D3]">{(patient?.name ?? 'Unknown')}</h3>
            <span className="text-xs text-[#7A8A76] truncate block w-48">{(patient?.email ?? '')}</span>
            <p className="text-[#9BA897] text-xs uppercase tracking-wider">{(patient?.role ?? 'patient')}</p>
          </div>
        </div>

        <div className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-widest border ${
          isCritical 
            ? 'bg-[rgba(224,82,82,0.15)] text-[#E05252] border-[rgba(224,82,82,0.3)] animate-pulse'
            : isWarning
              ? 'bg-[rgba(212,148,58,0.15)] text-[#D4943A] border-[rgba(212,148,58,0.3)]'
              : 'bg-[rgba(76,175,120,0.15)] text-[#4CAF78] border-[rgba(76,175,120,0.3)]'
        }`}>
          {status}
        </div>
      </div>

      {/* CHART (h=80px) */}
      <div className={`h-20 w-full mb-4 rounded-xl overflow-hidden ${isCritical ? 'shadow-[0_0_16px_rgba(224,82,82,0.25)]' : ''}`}>
        <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
        <ResponsiveContainer width="100%" height={80} minWidth={100}>
          <LineChart data={ecgData.slice(-40)} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <Line 
              type="monotone" 
              dataKey="bpm" 
              stroke={sColor} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex justify-between items-end">
        <div className="flex items-baseline space-x-1">
          <span className="text-xs text-[#7A8A76] uppercase tracking-wider font-semibold">BPM:</span>
          <span className="font-mono-data text-2xl font-bold" style={{ color: sColor }}>
            {currentBpm > 0 ? currentBpm : '--'}
          </span>
        </div>
        
        <div className="text-right">
          <p className="text-[#5C6B58] text-xs">HRV: {hrv}ms</p>
          <p className="text-[#5C6B58] text-[10px]">Updated {updatedAgo}s ago</p>
        </div>
      </div>
    </motion.div>
  );
}
