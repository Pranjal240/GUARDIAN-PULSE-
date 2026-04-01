'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import Image from 'next/image';

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
          // Determine initial role
          if (email.toLowerCase() === 'pranjalmishra2409@gmail.com') {
            role = 'admin';
          } else {
            // Check if they selected a role during sign-in
            const savedRole = localStorage.getItem('guardian_pulse_login_role');
            role = savedRole && savedRole === 'admin' && email === 'pranjalmishra2409@gmail.com' 
              ? 'admin' 
              : (savedRole || 'patient');
          }

          // Save new user profile
          await set(userRef, {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: email,
            role: role,
            avatarUrl: user.imageUrl || '',
            createdAt: Date.now()
          });
        }

        // Route based on role
        if (role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/patient');
        }
      } catch (error) {
        console.error('Error checking role:', error);
        // Fallback
        router.push('/patient');
      }
    }

    checkRole();
  }, [isLoadedUser, isAuthLoaded, userId, user, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-[#141A14]">
      <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
        <Image src="/logo/logo.png" alt="Guardian Pulse" width={80} height={80} className="animate-pulse" />
        
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
