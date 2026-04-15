"use client";

import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUserRole } from "@/lib/firebase-hooks";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const { role, loading: roleLoading } = useUserRole(userId || "");

  // ─── Role Gate: Only admins can access /dashboard ───
  useEffect(() => {
    if (!isLoaded || roleLoading) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    if (role && role !== "admin") {
      // Non-admin users are redirected away
      if (role === "pending_admin") {
        router.push("/pending-admin");
      } else {
        router.push("/patient");
      }
    }
  }, [isLoaded, roleLoading, userId, role, router]);

  // Show loading while checking role
  if (!isLoaded || roleLoading || role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141A14]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#D4B896] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#9BA897] text-sm font-inter">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#141A14] min-h-screen font-inter text-[#F0E6D3] relative">
      {/* Ambient background mesh */}
      <div className="ambient-mesh"></div>

      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-60 relative z-10">
        <TopHeader />
        <main className="flex-1 mt-14 md:mt-16 p-4 md:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
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
