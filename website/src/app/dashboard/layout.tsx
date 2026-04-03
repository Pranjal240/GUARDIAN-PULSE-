'use client';

import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex bg-[#141A14] min-h-screen font-inter text-[#F0E6D3] relative">
      {/* Ambient background mesh */}
      <div className="ambient-mesh"></div>
      
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 relative z-10">
        <TopHeader />
        <main className="flex-1 mt-16 p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
