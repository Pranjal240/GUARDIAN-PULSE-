'use client';

import { usePathname } from 'next/navigation';
import { useActiveAlerts } from '@/lib/firebase-hooks';
import { Bell } from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function TopHeader() {
  const pathname = usePathname();
  const { data: activeAlerts } = useActiveAlerts();
  const { user } = useUser();

  // Simple Breadcrumb logic
  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Overview';
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  };

  const alertCount = activeAlerts.length;

  return (
    <header className="fixed top-0 right-0 left-60 h-16 bg-[#141A14] border-b border-[rgba(212,184,150,0.08)] px-6 py-3 flex items-center justify-between z-40">
      
      {/* Left side -> Breadcrumbs */}
      <div className="flex items-center">
        <h1 className="text-[#9BA897] font-medium tracking-wide">
          Dashboard <span className="mx-2 text-[rgba(212,184,150,0.3)]">/</span> 
          <span className="text-[#F0E6D3] font-poppins font-semibold">{getBreadcrumb()}</span>
        </h1>
      </div>

      {/* Right side -> Status and Profile */}
      <div className="flex items-center space-x-6">
        
        {/* Network Status indicator */}
        <div className="flex items-center space-x-2 bg-[#1C2B1E] px-3 py-1.5 rounded-full border border-[rgba(74,103,65,0.3)]">
          <div className="w-2.5 h-2.5 bg-[#4CAF78] rounded-full live-dot"></div>
          <span className="text-[#4CAF78] text-sm font-mono-data tracking-wider font-semibold">LIVE</span>
        </div>

        {/* Alerts Bell */}
        <Link href="/dashboard/alerts" className="relative group p-2 hover:bg-[#1C2B1E] rounded-full transition-colors">
          <Bell className="h-5 w-5 text-[#9BA897] group-hover:text-[#F0E6D3]" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-[#E05252] rounded-full animate-critical"></span>
          )}
        </Link>
        
        {/* User Info (redundant but requested) */}
        <div className="flex items-center space-x-3 border-l border-[rgba(212,184,150,0.1)] pl-6">
          <span className="font-poppins text-sm text-[#D4B896] hidden md:block">
            {user?.fullName || 'Admin'}
          </span>
          <UserButton 
            appearance={{
              elements: { userButtonAvatarBox: "border-2 border-[rgba(212,184,150,0.2)]" }
            }}
          />
        </div>

      </div>
    </header>
  );
}
