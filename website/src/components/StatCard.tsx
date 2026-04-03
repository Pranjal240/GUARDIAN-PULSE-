'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  subtext: string;
  isAlert?: boolean;
  iconColorClass?: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) { setDisplay(0); return; }
    const duration = 1200;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display}</>;
}

export default function StatCard({ label, value, icon: Icon, subtext, isAlert, iconColorClass }: StatCardProps) {
  const numericValue = typeof value === 'number' ? value : 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`card-glass p-5 relative overflow-hidden group cursor-default ${
        isAlert ? 'animate-border-glow' : ''
      }`}
    >
      {/* Ambient background glow */}
      {isAlert && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(224,82,82,0.08),transparent_70%)]" />
      )}

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className={`p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${
          isAlert 
            ? 'bg-[rgba(224,82,82,0.12)]' 
            : 'bg-[rgba(212,184,150,0.08)]'
        }`}>
          <Icon className={`h-5 w-5 ${iconColorClass || 'text-[#D4B896]'}`} />
        </div>
        
        {!isAlert && (
          <div className="flex items-center gap-1 text-[#4CAF78] opacity-0 group-hover:opacity-100 transition-opacity">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <span className="font-mono text-3xl font-bold text-[#F0E6D3] block">
          {typeof value === 'number' ? <AnimatedNumber value={numericValue} /> : value}
        </span>
        <h3 className="font-poppins font-medium text-[#D4B896] text-sm mt-1">{label}</h3>
        <p className="text-[#5C6B58] text-xs mt-2">{subtext}</p>
      </div>

      {/* Decorative corner accent */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${
        isAlert ? 'bg-[#E05252]' : 'bg-[#D4B896]'
      }`} />
    </motion.div>
  );
}
