'use client';

import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';

export default function SignInPage() {
  const [selectedRole, setSelectedRole] = useState<'patient' | 'admin'>('patient');

  useEffect(() => {
    localStorage.setItem('guardian_pulse_login_role', selectedRole);
  }, [selectedRole]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#141A14] relative overflow-hidden">
      <div className="ambient-mesh"></div>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#141A14] via-[#1A2620] to-[#1C2B1E] flex-col justify-center px-16 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.25,0.1,0.25,1] }}
          className="z-10 max-w-lg"
        >
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-[#D4B896] rounded-full blur-3xl opacity-10 w-24 h-24"></div>
            <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={80} height={80} className="object-contain relative z-10" />
          </div>
          <h1 className="font-poppins font-bold text-4xl text-[#D4B896] mb-2 tracking-tight">
            Guardian Pulse
          </h1>
          <p className="font-inter text-[#9BA897] text-lg mb-12">
            Medical Monitoring Platform
          </p>

          <div className="space-y-4">
            {[
              { title: 'Real-time ECG Monitoring', icon: '🫀', desc: 'Live continuous heart data', delay: 0.3 },
              { title: 'AI-Powered Analysis', icon: '🧠', desc: 'Seizure & tremor detection', delay: 0.45 },
              { title: 'Emergency Alert System', icon: '🚨', desc: 'Instant dispatch notification', delay: 0.6 },
            ].map((item) => (
              <motion.div 
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay, duration: 0.6 }}
              >
                <FeatureCard title={item.title} desc={item.desc} icon={item.icon} />
              </motion.div>
            ))}
          </div>
        </motion.div>

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

        {/* Floating ambient orbs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#D4B896] rounded-full opacity-[0.02] blur-[100px] animate-spin-slow pointer-events-none" />
        <div className="absolute bottom-40 left-10 w-48 h-48 bg-[#4A6741] rounded-full opacity-[0.04] blur-[80px] pointer-events-none" style={{ animation: 'meshFloat 15s ease-in-out infinite' }} />
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[55%] bg-[#1A2218] flex flex-col justify-center items-center px-4 py-8 lg:p-8 overflow-y-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md flex flex-col items-center"
        >
          
          {/* Mobile logo */}
          <div className="mb-6 text-center lg:hidden">
            <Image src="/logo/logo.png" alt="Guardian Pulse Logo" width={60} height={60} className="mx-auto mb-4" />
            <h2 className="font-poppins text-2xl font-bold text-[#D4B896]">Guardian Pulse</h2>
          </div>

          <h2 className="font-poppins text-2xl font-semibold text-[#F0E6D3] mb-6 hidden lg:block text-center">
            Sign in to your account
          </h2>

          {/* ═══ DEMO WARNING BANNER ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full mb-6"
          >
            <div className="bg-[rgba(212,148,58,0.08)] border border-[rgba(212,148,58,0.3)] rounded-2xl p-4 relative overflow-hidden">
              {/* Animated accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#D4943A] to-transparent opacity-60" />
              
              <div className="flex items-start gap-3">
                <div className="bg-[rgba(212,148,58,0.15)] p-2 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-[#D4943A]" />
                </div>
                <div>
                  <p className="font-poppins font-semibold text-[#D4943A] text-sm mb-1">
                    Demo Mode Notice
                  </p>
                  <p className="text-[#C0B8A9] text-xs leading-relaxed">
                    If you don&apos;t have the <span className="text-[#D4B896] font-semibold">Guardian Pulse Medical Kit</span>, 
                    logging in with Google will show you a <span className="text-[#F0E6D3] font-semibold">demo preview</span> of 
                    the original working site and app with simulated health data.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Role Selector */}
          <div className="flex space-x-4 w-full mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole('patient')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden ${
                selectedRole === 'patient'
                  ? 'bg-[rgba(212,184,150,0.08)] border-[#D4B896] shadow-[0_0_20px_rgba(212,184,150,0.1)]'
                  : 'bg-[#1C2B1E] border-[rgba(212,184,150,0.12)] hover:bg-[#243028] hover:border-[rgba(212,184,150,0.25)]'
              }`}
            >
              {selectedRole === 'patient' && (
                <motion.div 
                  layoutId="roleGlow"
                  className="absolute inset-0 bg-gradient-to-br from-[rgba(212,184,150,0.06)] to-transparent rounded-xl"
                />
              )}
              <div className="relative z-10">
                <div className="text-2xl mb-2">🏥</div>
                <div className={`font-poppins font-semibold ${selectedRole === 'patient' ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                  Patient
                </div>
                <div className="text-sm text-[#9BA897] mt-1">Monitor your health</div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole('admin')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all text-left group relative overflow-hidden ${
                selectedRole === 'admin'
                  ? 'bg-[rgba(212,184,150,0.08)] border-[#D4B896] shadow-[0_0_20px_rgba(212,184,150,0.1)]'
                  : 'bg-[#1C2B1E] border-[rgba(212,184,150,0.12)] hover:bg-[#243028] hover:border-[rgba(212,184,150,0.25)]'
              }`}
            >
              {selectedRole === 'admin' && (
                <motion.div 
                  layoutId="roleGlow"
                  className="absolute inset-0 bg-gradient-to-br from-[rgba(212,184,150,0.06)] to-transparent rounded-xl"
                />
              )}
              <div className="relative z-10">
                <div className="text-2xl mb-2">👨‍⚕️</div>
                <div className={`font-poppins font-semibold ${selectedRole === 'admin' ? 'text-[#D4B896]' : 'text-[#F0E6D3]'}`}>
                  Admin / Doctor
                </div>
                <div className="text-sm text-[#9BA897] mt-1">Manage patients</div>
              </div>
            </motion.button>
          </div>

          {/* Admin approval notice */}
          <AnimatePresence>
            {selectedRole === 'admin' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="w-full overflow-hidden"
              >
                <div className="bg-[rgba(91,155,213,0.08)] border border-[rgba(91,155,213,0.25)] rounded-xl px-4 py-3 flex items-start space-x-3">
                  <span className="text-[#5B9BD5] text-lg mt-0.5">🔒</span>
                  <div>
                    <p className="text-[#5B9BD5] text-sm font-semibold">Admin access requires approval</p>
                    <p className="text-[#7A8A76] text-xs mt-1">An existing admin must approve your request before you can access the admin dashboard.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SignIn
            appearance={{
              elements: {
                card: 'bg-transparent shadow-none border-none p-0 w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
              },
            }}
          />
        </motion.div>
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
    <div className="flex items-center space-x-4 bg-[#1C2B1E] border border-[rgba(212,184,150,0.12)] rounded-xl p-4 transition-all hover:bg-[#243028] hover:border-[rgba(212,184,150,0.2)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] group">
      <div className="text-3xl bg-[rgba(212,184,150,0.08)] p-3 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="font-poppins font-semibold text-[#F0E6D3]">{title}</h3>
        <p className="font-inter text-[#9BA897] text-sm">{desc}</p>
      </div>
    </div>
  );
}
