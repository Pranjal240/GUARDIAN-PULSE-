'use client';

import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SignInPage() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'admin'>('patient');

  useEffect(() => {
    // default role saved to localStorage so app/page.tsx can assign it upon successful routing
    localStorage.setItem('guardian_pulse_login_role', selectedRole);
  }, [selectedRole]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#141A14]">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#141A14] to-[#1C2B1E] flex-col justify-center px-16 relative overflow-hidden">
        <div className="z-10 max-w-lg">
          <div className="mb-8">
            <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={80} height={80} className="object-contain" />
          </div>
          <h1 className="font-poppins font-bold text-4xl text-[#D4B896] mb-2 tracking-tight">
            Guardian Pulse
          </h1>
          <p className="font-inter text-[#9BA897] text-lg mb-12">
            Medical Monitoring Platform
          </p>

          <div className="space-y-4">
            <FeatureCard title="Real-time ECG Monitoring" icon="🫀" desc="Live continuous heart data" />
            <FeatureCard title="AI-Powered Analysis" icon="🧠" desc="Seizure & tremor detection" />
            <FeatureCard title="Emergency Alert System" icon="🚨" desc="Instant dispatch notification" />
          </div>
        </div>

        {/* Animated ECG SVG Background */}
        <div className="absolute bottom-0 left-0 w-full h-40 opacity-20 pointer-events-none">
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,50 L200,50 L230,20 L260,80 L290,10 L320,90 L350,50 L1000,50"
              fill="none"
              stroke="#D4B896"
              strokeWidth="4"
              strokeDasharray="1000"
              strokeDashoffset="1000"
              className="animate-[ecgDraw_3s_linear_infinite]"
            />
          </svg>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[55%] bg-[#1A2218] flex flex-col justify-center items-center px-4 py-12 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">
          
          <div className="mb-8 text-center lg:hidden">
            <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={60} height={60} className="mx-auto mb-4" />
            <h2 className="font-poppins text-2xl font-bold text-[#D4B896]">Guardian Pulse</h2>
          </div>

          <h2 className="font-poppins text-2xl font-semibold text-[#F0E6D3] mb-8 hidden lg:block text-center">
            Sign in to your account
          </h2>

          {/* Role Selector */}
          <div className="flex space-x-4 w-full mb-8">
            <button
              onClick={() => setSelectedRole('patient')}
              className={`flex-1 p-4 rounded-xl border transition-all text-left group ${
                selectedRole === 'patient'
                  ? 'bg-[rgba(212,184,150,0.08)] border-[#D4B896]'
                  : 'bg-[#1C2B1E] border-[rgba(212,184,150,0.15)] hover:bg-[#243028]'
              }`}
            >
              <div className="text-2xl mb-2">🏥</div>
              <div className={`font-poppins font-semibold ${selectedRole === 'patient' ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                Patient
              </div>
              <div className="text-sm text-[#9BA897] mt-1">Monitor your health</div>
            </button>

            <button
              onClick={() => setSelectedRole('admin')}
              className={`flex-1 p-4 rounded-xl border transition-all text-left group ${
                selectedRole === 'admin'
                  ? 'bg-[rgba(212,184,150,0.08)] border-[#D4B896]'
                  : 'bg-[#1C2B1E] border-[rgba(212,184,150,0.15)] hover:bg-[#243028]'
              }`}
            >
              <div className="text-2xl mb-2">👨‍⚕️</div>
              <div className={`font-poppins font-semibold ${selectedRole === 'admin' ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                Admin / Doctor
              </div>
              <div className="text-sm text-[#9BA897] mt-1">Manage patients</div>
            </button>
          </div>

          <SignIn
            appearance={{
              elements: {
                card: 'bg-transparent shadow-none border-none p-0 w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
              },
            }}
          />
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

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="flex items-center space-x-4 bg-[#1C2B1E] border border-[rgba(212,184,150,0.15)] rounded-xl p-4">
      <div className="text-3xl bg-[rgba(212,184,150,0.1)] p-3 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-poppins font-semibold text-[#F0E6D3]">{title}</h3>
        <p className="font-inter text-[#9BA897] text-sm">{desc}</p>
      </div>
    </div>
  );
}
