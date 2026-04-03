'use client';

import { useUser, useAuth, SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { LogOut, Stethoscope, Clock, ShieldCheck } from 'lucide-react';

export default function PendingAdminPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [elapsed, setElapsed] = useState('');
  const [requestedAt, setRequestedAt] = useState<number>(0);

  // Listen for status changes in real-time
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onValue(ref(db, `admin_requests/${userId}`), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setStatus(val.status);
        setRequestedAt(val.requestedAt || 0);
        
        if (val.status === 'approved') {
          // Redirect to dashboard after short delay for celebration animation
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      }
    });
    return () => unsubscribe();
  }, [userId, router]);

  // Update elapsed time
  useEffect(() => {
    if (!requestedAt) return;
    const interval = setInterval(() => {
      const diff = Date.now() - requestedAt;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) {
        setElapsed(`${hrs}h ${mins % 60}m ago`);
      } else {
        setElapsed(`${mins}m ago`);
      }
    }, 10000);
    // Set initial
    const diff = Date.now() - requestedAt;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      setElapsed(`${hrs}h ${mins % 60}m ago`);
    } else {
      setElapsed(mins === 0 ? 'Just now' : `${mins}m ago`);
    }
    return () => clearInterval(interval);
  }, [requestedAt]);

  return (
    <div className="min-h-screen bg-[#141A14] flex flex-col items-center justify-center relative overflow-hidden px-4">
      <div className="ambient-mesh"></div>

      {/* Animated ECG background lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute w-full" style={{ top: `${30 + i * 25}%` }}>
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-16">
              <path
                d="M0,50 L200,50 L230,20 L260,80 L290,10 L320,90 L350,50 L1000,50"
                fill="none"
                stroke="#D4B896"
                strokeWidth="3"
                strokeDasharray="1000"
                strokeDashoffset="1000"
                style={{ animation: `ecgDraw ${3 + i}s linear ${i * 0.8}s infinite` }}
              />
            </svg>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-lg text-center"
      >
        {/* Logo */}
        <div className="mb-8 relative inline-block">
          <div className="absolute inset-0 bg-[#D4B896] rounded-full blur-3xl opacity-15 scale-150"></div>
          <Image src="/logo/logo.png" alt="Guardian Pulse" width={80} height={80} className="relative z-10 mx-auto" />
        </div>

        <h1 className="font-poppins font-bold text-3xl text-[#D4B896] mb-2">Guardian Pulse</h1>
        <p className="text-[#9BA897] mb-10">Medical Monitoring Platform</p>

        {/* Status Card */}
        {status === 'pending' && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-glass p-8 text-center space-y-6"
          >
            {/* Animated waiting indicator */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-[rgba(91,155,213,0.15)] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-[#5B9BD5] rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="w-8 h-8 text-[#5B9BD5]" />
              </div>
            </div>

            <div>
              <h2 className="font-poppins font-semibold text-2xl text-[#F0E6D3] mb-2">
                Admin Access Pending
              </h2>
              <p className="text-[#9BA897] text-sm leading-relaxed max-w-sm mx-auto">
                Your request to access the admin dashboard has been submitted. An existing admin will review and approve your request.
              </p>
            </div>

            {/* Request details */}
            <div className="bg-[rgba(0,0,0,0.2)] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7A8A76]">Status</span>
                <span className="badge-pending px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-[#5B9BD5] rounded-full animate-pulse"></span>
                  <span>Pending Approval</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7A8A76]">Requested</span>
                <span className="text-[#D4B896] font-mono text-xs">{elapsed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7A8A76]">Email</span>
                <span className="text-[#F0E6D3] text-xs truncate max-w-[200px]">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
            </div>

            {/* Animated dots */}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-[#7A8A76] text-sm">Waiting for approval</span>
              <div className="flex space-x-1">
                {[0, 1, 2].map(i => (
                  <div 
                    key={i}
                    className="w-1.5 h-1.5 bg-[#5B9BD5] rounded-full"
                    style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {status === 'approved' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="card-glass p-8 text-center space-y-6"
          >
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-[#4CAF78] rounded-full opacity-20 animate-glow-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-12 h-12 text-[#4CAF78]" />
              </div>
            </div>
            <div>
              <h2 className="font-poppins font-semibold text-2xl text-[#4CAF78] mb-2">Access Approved! 🎉</h2>
              <p className="text-[#9BA897]">Redirecting to admin dashboard...</p>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-1 bg-[#2A3D2E] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2 }}
                  className="h-full bg-[#4CAF78] rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        {status === 'rejected' && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-glass p-8 text-center space-y-6"
          >
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#E05252] rounded-full opacity-10"></div>
              <span className="text-5xl">🚫</span>
            </div>
            <div>
              <h2 className="font-poppins font-semibold text-2xl text-[#E05252] mb-2">Request Declined</h2>
              <p className="text-[#9BA897] text-sm">Your admin access request was not approved. You can continue using the platform as a patient.</p>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <button
            onClick={() => router.push('/patient')}
            className="flex items-center space-x-2 px-6 py-3 bg-[#2A3D2E] hover:bg-[#3D5738] border border-[rgba(212,184,150,0.15)] text-[#F0E6D3] rounded-xl transition-all hover:shadow-lg"
          >
            <Stethoscope className="w-5 h-5 text-[#D4B896]" />
            <span className="font-medium">Continue as Patient</span>
          </button>

          <SignOutButton>
            <button className="flex items-center space-x-2 px-6 py-3 text-[#9BA897] hover:text-[#F0E6D3] transition-colors">
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Sign Out</span>
            </button>
          </SignOutButton>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ecgDraw {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
      `}} />
    </div>
  );
}
