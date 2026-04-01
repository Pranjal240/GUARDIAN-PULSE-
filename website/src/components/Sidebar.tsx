'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Activity, AlertTriangle, MessageSquare, Settings, LogOut } from 'lucide-react';
import { UserButton, useUser, SignOutButton } from '@clerk/nextjs';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/ecg', label: 'ECG Monitor', icon: Activity },
  { href: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#1A2620] border-r border-[#2A3D2E] flex flex-col z-50 shadow-2xl">
      {/* Brand */}
      <div className="flex items-center space-x-3 px-6 py-8 border-b border-[rgba(212,184,150,0.08)]">
        <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={36} height={36} className="object-cover" />
        <span className="font-poppins font-bold text-[#D4B896] text-xl tracking-wide">
          Guardian Pulse
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const IconStyle = isActive ? "text-[#E0CAB0]" : "text-[#7A8A76]";
          const TextStyle = isActive ? "text-[#E0CAB0] font-medium" : "text-[#9BA897]";

          return (
            <Link key={item.href} href={item.href} className="relative block group">
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 bg-[rgba(212,184,150,0.08)] rounded-xl border-l-[3px] border-[#D4B896]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className={`relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${!isActive && 'hover:bg-[#243028]'}`}>
                <item.icon className={`h-5 w-5 transition-colors group-hover:text-[#D4B896] ${IconStyle}`} />
                <span className={`transition-colors group-hover:text-[#D4B896] ${TextStyle}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-[rgba(212,184,150,0.08)] p-4 space-y-4 bg-[#141A14]">
        <div className="flex flex-col space-y-3">
          <SignOutButton>
            <button className="flex items-center space-x-3 text-[#9BA897] hover:text-[#D4B896] transition-colors p-2 rounded-lg hover:bg-[#1C2B1E]">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Log Out Securely</span>
            </button>
          </SignOutButton>

          {user && (
            <div className="flex items-center space-x-3 p-2 bg-[#1C2B1E] rounded-xl border border-[rgba(212,184,150,0.1)] shadow-inner">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8",
                  }
                }} 
              />
              <div className="flex flex-col truncate">
                <span className="text-sm font-poppins font-semibold text-[#D4B896] truncate">
                  {user.fullName || 'Administrator'}
                </span>
                <span className="text-xs text-[#5C6B58] truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
