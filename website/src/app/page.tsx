'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import Image from 'next/image';

const SUPER_ADMIN_EMAIL = 'pranjalmishra2409@gmail.com';

export default function Home() {
  const { user, isLoaded: isLoadedUser } = useUser();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkRole() {
      if (!isLoadedUser || !isAuthLoaded) return;
      
      // If not logged in, send to sign-in
      if (!userId || !user) {
        router.push('/sign-in');
        return;
      }

      const email = user.primaryEmailAddress?.emailAddress || '';
      const userRef = ref(db, `users/${userId}`);
      
      try {
        const snapshot = await get(userRef);
        let role = '';

        if (snapshot.exists()) {
          role = snapshot.val().role;
        } else {
          // NEW USER — determine initial role
          const savedRole = localStorage.getItem('guardian_pulse_login_role');
          const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL;

          if (isSuperAdmin) {
            // Super admin is always auto-approved
            role = 'admin';
          } else if (savedRole === 'admin') {
            // User selected admin role → create a pending request
            role = 'pending_admin';
            
            // Write admin request to Firebase
            await set(ref(db, `admin_requests/${userId}`), {
              email: email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
              avatarUrl: user.imageUrl || '',
              requestedAt: Date.now(),
              status: 'pending',
            });

            // Write audit log entry
            await set(ref(db, `audit_log/${Date.now()}_${userId.slice(0, 8)}`), {
              action: 'admin_request_created',
              performedBy: userId,
              performedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              details: `${email} requested admin access`,
              timestamp: Date.now(),
            });
          } else {
            role = 'patient';
          }

          // Save new user profile
          await set(userRef, {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: email,
            role: role,
            avatarUrl: user.imageUrl || '',
            createdAt: Date.now(),
          });
        }

        // Handle returning users who selected admin on login
        if (role === 'patient' || role === 'admin' || role === 'pending_admin') {
          const savedRole = localStorage.getItem('guardian_pulse_login_role');
          
          // Existing patient trying to login as admin
          if (savedRole === 'admin' && role === 'patient') {
            const adminReqRef = ref(db, `admin_requests/${userId}`);
            const adminReqSnap = await get(adminReqRef);
            
            if (!adminReqSnap.exists()) {
              // No existing request — create one
              role = 'pending_admin';
              await set(ref(db, `users/${userId}/role`), 'pending_admin');
              await set(adminReqRef, {
                email: email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
                avatarUrl: user.imageUrl || '',
                requestedAt: Date.now(),
                status: 'pending',
              });
              await set(ref(db, `audit_log/${Date.now()}_${userId.slice(0, 8)}`), {
                action: 'admin_request_created',
                performedBy: userId,
                performedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                details: `${email} requested admin access (existing patient)`,
                timestamp: Date.now(),
              });
            } else if (adminReqSnap.val().status === 'rejected') {
              // Previously rejected — allow re-request
              role = 'pending_admin';
              await set(ref(db, `users/${userId}/role`), 'pending_admin');
              await set(adminReqRef, {
                email: email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
                avatarUrl: user.imageUrl || '',
                requestedAt: Date.now(),
                status: 'pending',
              });
            } else if (adminReqSnap.val().status === 'pending') {
              role = 'pending_admin';
            }
          }
        }

        // Clear localStorage role after processing
        localStorage.removeItem('guardian_pulse_login_role');

        // Route based on final role
        if (role === 'admin') {
          router.push('/dashboard');
        } else if (role === 'pending_admin') {
          router.push('/pending-admin');
        } else {
          router.push('/patient');
        }
      } catch (error) {
        console.error('Error checking role:', error);
        router.push('/patient');
      }
    }

    checkRole();
  }, [isLoadedUser, isAuthLoaded, userId, user, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-[#141A14] relative overflow-hidden">
      <div className="ambient-mesh"></div>
      
      <div className="flex flex-col items-center space-y-6 animate-fade-slide-up relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-[#D4B896] rounded-full blur-2xl opacity-20 animate-glow-pulse"></div>
          <Image src="/logo/logo.png" alt="Guardian Pulse" width={80} height={80} className="relative z-10 animate-heartbeat" />
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-[#D4B896] live-dot"></div>
          <h2 className="font-poppins text-[#F0E6D3] text-xl font-medium tracking-wide">
            Loading Guardian Pulse...
          </h2>
        </div>

        {/* Animated ECG SVG Background */}
        <div className="w-64 h-16 opacity-30 mt-4">
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,50 L200,50 L230,20 L260,80 L290,10 L320,90 L350,50 L1000,50"
              fill="none"
              stroke="#D4B896"
              strokeWidth="6"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              className="animate-[ecgDraw_2s_linear_infinite]"
            />
          </svg>
        </div>

        {/* Loading dots */}
        <div className="flex space-x-2 mt-4">
          {[0, 1, 2].map(i => (
            <div 
              key={i} 
              className="w-2 h-2 bg-[#D4B896] rounded-full"
              style={{ animation: `typingBounce 1s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ecgDraw {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
      `}} />
    </div>
  );
}
