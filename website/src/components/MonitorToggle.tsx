'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { toggleMonitor } from '@/lib/firebase-hooks';
import { Power, PowerOff } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface MonitorToggleProps {
  userId: string;
  patientName: string;
  /** Whether monitoring is currently disabled */
  isDisabled: boolean;
  /** Compact mode for inline use in tables/cards */
  compact?: boolean;
  /** Whether the user has gone offline (>36h) */
  isOffline?: boolean;
}

export default function MonitorToggle({
  userId,
  patientName,
  isDisabled,
  compact = false,
  isOffline = false,
}: MonitorToggleProps) {
  const { user } = useUser();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click handlers (e.g., expanding rows)
    e.preventDefault();
    if (toggling || !user) return;

    setToggling(true);
    
    if (isOffline) {
      toast.error(`${patientName} has been offline for >36 hours. Monitor disabled automatically.`, { duration: 4000 });
      setToggling(false);
      return;
    }
    
    const newDisabled = !isDisabled;

    const success = await toggleMonitor(
      userId,
      patientName,
      newDisabled,
      user.id,
      user.fullName || 'Admin',
    );

    if (success) {
      toast.success(
        newDisabled
          ? `Monitor disabled for ${patientName}`
          : `Monitor re-enabled for ${patientName}`,
        { icon: newDisabled ? '🔴' : '🟢', duration: 3000 },
      );
    } else {
      toast.error('Failed to toggle monitor');
    }

    setToggling(false);
  };

  if (compact) {
    return (
      <div
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer select-none ${
          toggling ? 'opacity-50 pointer-events-none' : ''
        } ${
          isDisabled
            ? 'bg-[#E05252]/30 border border-[#E05252]/40'
            : 'bg-[#4CAF78]/30 border border-[#4CAF78]/40'
        }`}
        title={isDisabled ? 'Monitor OFF — Click to enable' : 'Monitor ON — Click to disable'}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`inline-block h-4 w-4 rounded-full shadow-lg ${
            isDisabled
              ? 'translate-x-1 bg-[#E05252]'
              : 'translate-x-6 bg-[#4CAF78]'
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isDisabled
          ? 'bg-[#2D1515]/50 border-[#E05252]/25'
          : 'bg-[#1C2B1E] border-[rgba(76,175,120,0.2)]'
      }`}
    >
      <div
        className={`p-2 rounded-lg ${
          isDisabled ? 'bg-[#E05252]/12' : 'bg-[#4CAF78]/12'
        }`}
      >
        {isDisabled ? (
          <PowerOff className="w-4 h-4 text-[#E05252]" />
        ) : (
          <Power className="w-4 h-4 text-[#4CAF78]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${isDisabled ? 'text-[#E05252]' : 'text-[#4CAF78]'}`}>
          {isDisabled ? 'Monitor Disabled' : 'Monitor Active'}
        </p>
        <p className="text-[10px] text-[#7A8A76] truncate">
          {isDisabled ? 'Patient sees flatline & zero vitals' : 'Live data streaming'}
        </p>
      </div>

      <div
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 cursor-pointer select-none ${
          toggling ? 'opacity-50 pointer-events-none' : ''
        } ${
          isDisabled
            ? 'bg-[#E05252]/25 border border-[#E05252]/40'
            : 'bg-[#4CAF78]/25 border border-[#4CAF78]/40'
        }`}
        title={isDisabled ? 'Click to re-enable monitoring' : 'Click to disable monitoring'}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`inline-block h-5 w-5 rounded-full shadow-lg ${
            isDisabled
              ? 'translate-x-1 bg-[#E05252] shadow-[0_0_8px_rgba(224,82,82,0.4)]'
              : 'translate-x-6 bg-[#4CAF78] shadow-[0_0_8px_rgba(76,175,120,0.4)]'
          }`}
        />
      </div>
    </div>
  );
}
