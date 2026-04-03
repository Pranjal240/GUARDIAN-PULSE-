'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Activity, AlertTriangle, MessageSquare, Settings, LogOut, ShieldCheck, BarChart3, ScrollText, Menu, X } from 'lucide-react';
import { UserButton, useUser, SignOutButton } from '@clerk/nextjs';
import { usePendingAdminCount, useSupportRequestCount } from '@/lib/firebase-hooks';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/ecg', label: 'ECG Monitor', icon: Activity },
  { href: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin-requests', label: 'Admin Requests', icon: ShieldCheck, badge: true },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare, supportBadge: true },
  { href: '/dashboard/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const pendingCount = usePendingAdminCount();
  const supportCount = useSupportRequestCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-[rgba(212,184,150,0.08)]">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#D4B896] rounded-full blur-md opacity-20"></div>
            <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={36} height={36} className="object-cover relative z-10" />
          </div>
          <span className="font-poppins font-bold text-[#D4B896] text-lg tracking-wide">
            Guardian Pulse
          </span>
        </div>
        {/* Close button for mobile */}
        <button 
          onClick={() => setMobileOpen(false)} 
          className="md:hidden p-2 rounded-lg hover:bg-[#243028] transition-colors"
        >
          <X className="w-5 h-5 text-[#9BA897]" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const IconStyle = isActive ? "text-[#E0CAB0]" : "text-[#7A8A76]";
          const TextStyle = isActive ? "text-[#E0CAB0] font-medium" : "text-[#9BA897]";

          return (
            <Link key={item.href} href={item.href} className="relative block group" onClick={() => setMobileOpen(false)}>
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 bg-[rgba(212,184,150,0.08)] rounded-xl border-l-[3px] border-[#D4B896]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className={`relative flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${!isActive && 'hover:bg-[#243028]'}`}>
                <item.icon className={`h-5 w-5 transition-colors group-hover:text-[#D4B896] ${IconStyle}`} />
                <span className={`transition-colors group-hover:text-[#D4B896] text-sm ${TextStyle}`}>
                  {item.label}
                </span>
                
                {/* Badge for admin requests */}
                {item.badge && pendingCount > 0 && (
                  <span className="ml-auto bg-[#E05252] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
                {/* Badge for support requests */}
                {'supportBadge' in item && item.supportBadge && supportCount > 0 && (
                  <span className="ml-auto bg-[#D4943A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                    {supportCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-[rgba(212,184,150,0.08)] p-4 space-y-3 bg-[#141A14]">
        <SignOutButton>
          <button className="flex items-center space-x-3 text-[#9BA897] hover:text-[#D4B896] transition-colors p-2 rounded-lg hover:bg-[#1C2B1E] w-full">
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button — fixed top-left */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-[60] p-2.5 bg-[#1A2620] border border-[rgba(212,184,150,0.15)] rounded-xl shadow-lg hover:bg-[#243028] transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-[#D4B896]" />
      </button>

      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-[#1A2620] border-r border-[#2A3D2E] flex-col z-50 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile overlay + sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-[rgba(10,16,10,0.7)] backdrop-blur-sm z-[70]"
            />
            {/* Slide-in panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 bg-[#1A2620] border-r border-[#2A3D2E] flex flex-col z-[80] shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
