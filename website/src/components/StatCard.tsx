'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  subtext: string;
  iconColorClass?: string;
  isAlert?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  iconColorClass = 'text-[#D4B896]',
  isAlert = false,
  valuePrefix = '',
  valueSuffix = ''
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // requestAnimationFrame based count-up
  useEffect(() => {
    let startTime: number;
    const duration = 1500; // 1.5s
    
    // Only animate from 0 to target primarily on mount
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easing * value));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [value]);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
      className={`card-style relative p-5 border-t-[3px] overflow-hidden ${
        isAlert
          ? 'border-t-[#E05252] animate-critical'
          : 'border-t-[#D4B896]'
      }`}
    >
      <div className="flex justify-between items-start z-10 relative">
        <div className="flex flex-col">
          <span className="text-[#9BA897] text-xs font-semibold uppercase tracking-wider mb-2">
            {label}
          </span>
          <div className="flex items-baseline space-x-1">
            <span className="font-mono-data text-4xl text-[#F0E6D3] font-semibold tracking-tight">
              {valuePrefix}{displayValue}{valueSuffix}
            </span>
          </div>
          <span className="text-[#7A8A76] text-xs mt-2">
            {subtext}
          </span>
        </div>
        
        <div className={`p-3 rounded-2xl bg-[rgba(212,184,150,0.05)] border border-[rgba(212,184,150,0.1)] ${iconColorClass}`}>
          <Icon className="w-8 h-8 opacity-80" />
        </div>
      </div>
      
      {/* Background super subtle glow based on alert state */}
      {isAlert && (
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-[#E05252] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      )}
    </motion.div>
  );
}
