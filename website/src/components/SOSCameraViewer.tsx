'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Maximize2, Minimize2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface SOSCameraViewerProps {
  userId: string;
}

/**
 * Admin-side component that displays the patient's SOS camera feed.
 * Subscribes to the user's sosCamera node in Firebase and renders the latest frame.
 * Shows the feed as long as the camera is active OR there's a recent frame.
 */
export default function SOSCameraViewer({ userId }: SOSCameraViewerProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevUserIdRef = useRef(userId);

  // Keep "now" ticking so time-based visibility recalculates
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Reset dismiss state when switching patients
    if (prevUserIdRef.current !== userId) {
      setIsDismissed(false);
      setFrame(null);
      setIsActive(false);
      setUpdatedAt(0);
      prevUserIdRef.current = userId;
    }

    const camRef = ref(db, `users/${userId}/sosCamera`);
    const unsub = onValue(camRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setIsActive(!!data.active);
        if (data.frame) setFrame(data.frame);
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      } else {
        setIsActive(false);
      }
    });
    return () => unsub();
  }, [userId]);

  // Show the viewer if:
  // 1. Camera is currently active (even if no frame yet — show "Connecting..." state), OR
  // 2. We have a frame from the last 60 seconds
  const hasRecentFrame = !!frame && (now - updatedAt < 60000);
  const shouldShow = (isActive || hasRecentFrame) && !isDismissed;

  if (!shouldShow) return null;

  const timeSince = now - updatedAt;
  const isStale = !isActive || timeSince > 10000;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className={`rounded-xl overflow-hidden border-2 shadow-lg bg-black ${
          isActive 
            ? 'border-[#E05252]/60 shadow-[0_0_25px_rgba(224,82,82,0.3)]' 
            : 'border-[#D4B896]/30 shadow-[0_0_15px_rgba(212,184,150,0.15)]'
        } ${isExpanded ? 'w-full' : 'w-full max-w-[320px]'}`}
      >
        {/* Header */}
        <div className={`px-3 py-2 flex items-center justify-between ${isActive ? 'bg-[#2D1515]' : 'bg-[#2B2515]'}`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#E05252] animate-pulse' : 'bg-[#D4B896]'}`} />
            {isActive ? (
              <Video className="w-3 h-3 text-[#E05252]" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-[#D4B896]" />
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#E05252]' : 'text-[#D4B896]'}`}>
              {isActive ? 'SOS Camera — LIVE' : 'SOS Camera — Last Frame'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className={`relative ${isExpanded ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
          {frame ? (
            <img
              src={frame}
              alt="Patient SOS camera"
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            /* No frame yet — camera is active but still connecting */
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A0F0F] text-[#E05252]">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-mono">Connecting to patient camera...</span>
            </div>
          )}

          {/* Live / Status indicator */}
          <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full ${
            isActive && !isStale
              ? 'bg-[#E05252]/80'
              : isActive
                ? 'bg-[#D4B896]/80'
                : 'bg-black/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive && !isStale ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
            <span className="text-[8px] text-white font-bold uppercase">
              {isActive && !isStale ? 'Live' : isActive ? 'Buffering...' : 'Ended'}
            </span>
          </div>

          {/* Timestamp */}
          {updatedAt > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[8px] text-white/70 font-mono">
              {new Date(updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Status footer */}
        <div className={`px-3 py-1.5 text-center ${isActive ? 'bg-[#2D1515]' : 'bg-[#2B2515]'}`}>
          <p className={`text-[9px] ${isActive ? 'text-[#E05252]/70' : 'text-[#D4B896]/70'}`}>
            {isActive && !frame
              ? '🔴 Camera active — waiting for first frame...'
              : isActive
                ? `🔴 Receiving live feed — updated ${Math.round(timeSince / 1000)}s ago`
                : `📷 Camera ended — last frame from ${new Date(updatedAt).toLocaleTimeString()}`
            }
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
