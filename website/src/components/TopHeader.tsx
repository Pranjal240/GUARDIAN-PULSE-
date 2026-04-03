'use client';

import { usePathname } from 'next/navigation';
import { useActiveAlerts, usePendingAdminCount } from '@/lib/firebase-hooks';
import { Bell, ShieldCheck } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopHeader() {
  const pathname = usePathname();
  const { data: activeAlerts } = useActiveAlerts();
  const pendingAdminCount = usePendingAdminCount();
  const { user } = useUser();
  const [bellShake, setBellShake] = useState(false);

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Overview';
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    // Handle multi-word paths
    return lastPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const alertCount = activeAlerts.length;

  return (
    <header className="fixed top-0 right-0 left-60 h-16 bg-[rgba(20,26,20,0.85)] backdrop-blur-xl border-b border-[rgba(212,184,150,0.08)] px-6 py-3 flex items-center justify-between z-40">
      
      {/* Left side -> Breadcrumbs */}
      <div className="flex items-center">
        <h1 className="text-[#9BA897] font-medium tracking-wide">
          Dashboard <span className="mx-2 text-[rgba(212,184,150,0.3)]">/</span> 
          <motion.span
            key={getBreadcrumb()}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#F0E6D3] font-poppins font-semibold inline-block"
          >
            {getBreadcrumb()}
          </motion.span>
        </h1>
      </div>

      {/* Right side -> Status and Profile */}
      <div className="flex items-center space-x-5">
        
        {/* Network Status indicator */}
        <div className="flex items-center space-x-2 bg-[rgba(28,43,30,0.6)] backdrop-blur-sm px-3 py-1.5 rounded-full border border-[rgba(74,103,65,0.3)]">
          <div className="w-2.5 h-2.5 bg-[#4CAF78] rounded-full live-dot"></div>
          <span className="text-[#4CAF78] text-sm font-mono tracking-wider font-semibold">LIVE</span>
        </div>

        {/* Pending Admin Requests Badge */}
        {pendingAdminCount > 0 && (
          <Link 
            href="/dashboard/admin-requests" 
            className="relative group flex items-center space-x-2 bg-[rgba(91,155,213,0.08)] border border-[rgba(91,155,213,0.2)] px-3 py-1.5 rounded-full hover:bg-[rgba(91,155,213,0.15)] transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-[#5B9BD5]" />
            <span className="text-[#5B9BD5] text-xs font-semibold">{pendingAdminCount} pending</span>
          </Link>
        )}

        {/* Alerts Bell */}
        <Link 
          href="/dashboard/alerts" 
          className={`relative group p-2 hover:bg-[#1C2B1E] rounded-full transition-colors ${bellShake ? 'animate-bell-shake' : ''}`}
          onMouseEnter={() => { if (alertCount > 0) { setBellShake(true); setTimeout(() => setBellShake(false), 600); } }}
        >
          <Bell className="h-5 w-5 text-[#9BA897] group-hover:text-[#F0E6D3] transition-colors" />
          {alertCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05252] opacity-40"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E05252] text-[8px] text-white font-bold items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            </span>
          )}
        </Link>
        
        {/* User Info */}
        <div className="flex items-center space-x-3 border-l border-[rgba(212,184,150,0.1)] pl-5">
          <div className="hidden md:flex flex-col items-end">
            <span className="font-poppins text-sm text-[#D4B896] font-medium">
              {user?.fullName || 'Admin'}
            </span>
            <span className="text-[10px] text-[#5C6B58] uppercase tracking-wider font-semibold">Administrator</span>
          </div>
          <UserButton 
            appearance={{
              elements: { userButtonAvatarBox: "border-2 border-[rgba(212,184,150,0.2)] hover:border-[#D4B896] transition-colors" }
            }}
          />
        </div>
      </div>
    </header>
  );
}
