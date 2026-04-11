'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Maximize2, Minimize2, X } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface SOSCameraViewerProps {
  userId: string;
}

/**
 * Admin-side component that displays the patient's SOS camera feed.
 * Subscribes to the user's sosCamera node in Firebase and renders the latest frame.
 */
export default function SOSCameraViewer({ userId }: SOSCameraViewerProps) {
  const [frame, setFrame] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsDismissed(false);
    const camRef = ref(db, `users/${userId}/sosCamera`);
    const unsub = onValue(camRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setIsActive(!!data.active);
        if (data.frame) setFrame(data.frame);
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      } else {
        setIsActive(false);
        setFrame(null);
      }
    });
    return () => unsub();
  }, [userId]);

  if (!isActive || !frame || isDismissed) return null;

  const timeSince = Date.now() - updatedAt;
  const isStale = timeSince > 15000; // >15s old = stale

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`rounded-xl overflow-hidden border-2 border-[#E05252]/40 shadow-[0_0_20px_rgba(224,82,82,0.2)] bg-black ${
          isExpanded ? 'w-full' : 'w-full max-w-[280px]'
        }`}
      >
        {/* Header */}
        <div className="bg-[#2D1515] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isStale ? 'bg-[#D4B896]' : 'bg-[#E05252] animate-pulse'}`} />
            <Video className="w-3 h-3 text-[#E05252]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E05252]">
              SOS Camera Feed
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-[#E05252]/20 rounded text-[#E05252]/60 hover:text-[#E05252] transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-[#E05252]/20 rounded text-[#E05252]/60 hover:text-[#E05252] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className={`relative ${isExpanded ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
          <img
            src={frame}
            alt="Patient SOS camera"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Live indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#E05252]/80 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[8px] text-white font-bold uppercase">
              {isStale ? 'Buffering...' : 'Live'}
            </span>
          </div>
          {/* Timestamp */}
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[8px] text-white/70 font-mono">
            {new Date(updatedAt).toLocaleTimeString()}
          </div>
        </div>

        {isStale && (
          <div className="bg-[#2B2515] px-3 py-1.5 text-center">
            <p className="text-[9px] text-[#D4B896]">⚠️ Feed may be delayed — last update {Math.round(timeSince / 1000)}s ago</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
