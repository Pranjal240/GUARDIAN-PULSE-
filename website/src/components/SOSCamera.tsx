'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraOff, Video, X, Wifi, WifiOff } from 'lucide-react';
import { ref, update, set, push, remove, onValue, onChildAdded } from 'firebase/database';
import { db } from '@/lib/firebase';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

interface SOSCameraProps {
  userId: string;
  isActive: boolean;
  onClose: () => void;
}

/**
 * SOS Camera (Patient side):
 * 1. Opens front camera
 * 2. Creates a WebRTC peer connection and writes an SDP offer to Firebase
 * 3. Waits for the admin's SDP answer via Firebase signaling
 * 4. Exchanges ICE candidates via Firebase
 * 5. Live video streams peer-to-peer once connected
 * 6. Also captures periodic JPEG snapshots as fallback
 */
export default function SOSCamera({ userId, isActive, onClose }: SOSCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const snapshotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const userIdRef = useRef(userId);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [peerState, setPeerState] = useState<string>('new');

  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Capture a low-quality JPEG snapshot and write to Firebase as fallback
  const captureSnapshot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const uid = userIdRef.current;
    if (!video || !canvas || !uid || video.readyState < 2 || video.videoWidth === 0) return;
    try {
      canvas.width = 240;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 240, 180);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.35);
      await update(ref(db, `users/${uid}/sosCamera`), {
        frame: dataUrl,
        updatedAt: Date.now(),
        active: true,
      });
    } catch { /* ignore snapshot failures */ }
  }, []);

  const startCamera = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      // 1. Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasPermission(true);
      setIsStreaming(true);

      // 2. Clean previous signaling data
      await remove(ref(db, `users/${uid}/webrtc`)).catch(() => {});

      // 3. Mark camera active
      await update(ref(db, `users/${uid}/sosCamera`), {
        active: true,
        updatedAt: Date.now(),
      });

      // 4. Create WebRTC peer connection
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        setPeerState(pc.connectionState);
      };

      // Add camera tracks to the connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 5. Write our ICE candidates to Firebase
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          push(ref(db, `users/${uid}/webrtc/offerCandidates`), event.candidate.toJSON());
        }
      };

      // 6. Create SDP offer and write to Firebase
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(db, `users/${uid}/webrtc/offer`), {
        sdp: offer.sdp,
        type: offer.type,
      });

      // 7. Listen for admin's SDP answer
      const answerUnsub = onValue(ref(db, `users/${uid}/webrtc/answer`), async (snap) => {
        if (!snap.exists() || !pcRef.current) return;
        if (pcRef.current.currentRemoteDescription) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(snap.val()));
        } catch (e) {
          console.error('WebRTC: failed to set answer:', e);
        }
      });
      unsubsRef.current.push(answerUnsub);

      // 8. Listen for admin's ICE candidates
      const candidateUnsub = onChildAdded(
        ref(db, `users/${uid}/webrtc/answerCandidates`),
        async (snap) => {
          if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(snap.val()));
          } catch { /* ignore late candidates */ }
        }
      );
      unsubsRef.current.push(candidateUnsub);

      // 9. Fallback: capture snapshots every 5s
      setTimeout(() => captureSnapshot(), 1500);
      snapshotRef.current = setInterval(captureSnapshot, 5000);

    } catch (err) {
      console.error('SOS Camera error:', err);
      setHasPermission(false);
    }
  }, [captureSnapshot]);

  const stopCamera = useCallback(async () => {
    const uid = userIdRef.current;

    // Stop snapshot interval
    if (snapshotRef.current) {
      clearInterval(snapshotRef.current);
      snapshotRef.current = null;
    }

    // Close WebRTC
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Unsubscribe Firebase listeners
    unsubsRef.current.forEach(unsub => unsub());
    unsubsRef.current = [];

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsStreaming(false);
    setPeerState('closed');

    // Clean Firebase signaling data and mark camera inactive
    if (uid) {
      await remove(ref(db, `users/${uid}/webrtc`)).catch(() => {});
      await update(ref(db, `users/${uid}/sosCamera`), {
        active: false,
        updatedAt: Date.now(),
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isActive) startCamera();
    else stopCamera();
    return () => { stopCamera(); };
  }, [isActive, startCamera, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 w-[200px] md:w-[260px] rounded-2xl overflow-hidden border-2 border-[#E05252]/50 shadow-[0_0_30px_rgba(224,82,82,0.3)]"
      >
        {/* Header */}
        <div className="bg-[#2D1515] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E05252] animate-pulse" />
            <Video className="w-3 h-3 text-[#E05252]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E05252]">
              SOS Live
            </span>
          </div>
          <div className="flex items-center gap-1">
            {peerState === 'connected' ? (
              <Wifi className="w-3 h-3 text-green-400" />
            ) : peerState === 'failed' ? (
              <WifiOff className="w-3 h-3 text-red-400" />
            ) : null}
            <button
              onClick={handleClose}
              className="p-1 hover:bg-[#E05252]/20 rounded-lg transition-colors text-[#E05252]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video feed */}
        <div className="bg-black aspect-[4/3] relative">
          {hasPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <CameraOff className="w-8 h-8 text-[#E05252]/50 mb-2" />
              <p className="text-[#9BA897] text-[10px]">Camera access denied</p>
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
                  <span className="text-[8px] text-white font-bold uppercase">
                    {peerState === 'connected' ? 'P2P Live' : 'Streaming'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for snapshot fallback */}
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
