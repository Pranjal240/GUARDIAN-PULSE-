'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Video, X } from 'lucide-react';
import { ref, update, push } from 'firebase/database';
import { db } from '@/lib/firebase';

interface SOSCameraProps {
  userId: string;
  isActive: boolean;
  onClose: () => void;
}

/**
 * SOS Camera: Opens front camera, streams periodic snapshots to Firebase
 * so admin can see what's happening in real-time.
 */
export default function SOSCamera({ userId, isActive, onClose }: SOSCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
      setIsStreaming(true);

      // Send an initial snapshot immediately
      setTimeout(() => captureAndSend(), 1000);

      // Send snapshot every 5 seconds
      intervalRef.current = setInterval(() => captureAndSend(), 5000);
    } catch {
      setHasPermission(false);
    }
  }, [userId]);

  const captureAndSend = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 320, 240);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

    // Store latest frame on user node
    update(ref(db, `users/${userId}`), {
      sosCamera: {
        frame: dataUrl,
        updatedAt: Date.now(),
        active: true,
      },
    });
  }, [userId]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);

    // Mark camera as inactive
    update(ref(db, `users/${userId}`), {
      sosCamera: { active: false, updatedAt: Date.now() },
    });
  }, [userId]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    }
    return () => stopCamera();
  }, [isActive]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 w-[200px] md:w-[240px] rounded-2xl overflow-hidden border-2 border-[#E05252]/50 shadow-[0_0_30px_rgba(224,82,82,0.3)]"
      >
        {/* Header */}
        <div className="bg-[#2D1515] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E05252] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E05252]">
              SOS Live
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#E05252]/20 rounded-lg transition-colors text-[#E05252]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video feed */}
        <div className="bg-black aspect-[4/3] relative">
          {hasPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <CameraOff className="w-8 h-8 text-[#E05252]/50 mb-2" />
              <p className="text-[#9BA897] text-[10px]">
                Camera access denied
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {isStreaming && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#E05252]/80 px-2 py-0.5 rounded-full">
                  <Video className="w-2.5 h-2.5 text-white" />
                  <span className="text-[8px] text-white font-bold uppercase">Streaming</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <div className="bg-[#2D1515] px-3 py-1.5">
          <p className="text-[8px] text-[#E05252]/60 text-center">
            Live feed shared with admin
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
