'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Maximize2, Minimize2, X, AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { ref, onValue, set, push, onChildAdded } from 'firebase/database';
import { db } from '@/lib/firebase';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

interface SOSCameraViewerProps {
  userId: string;
}

/**
 * Admin-side SOS Camera Viewer:
 * 1. Listens for sosCamera.active on the patient's Firebase node
 * 2. When active, auto-answers the WebRTC call (reads offer, writes answer)
 * 3. Displays live peer-to-peer video stream
 * 4. Falls back to showing snapshot frames if WebRTC doesn't connect
 */
export default function SOSCameraViewer({ userId }: SOSCameraViewerProps) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const prevUserIdRef = useRef(userId);

  const [isActive, setIsActive] = useState(false);
  const [isLive, setIsLive] = useState(false); // WebRTC connected
  const [peerState, setPeerState] = useState<string>('new');
  const [frame, setFrame] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick for time-based UI
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(tick);
  }, []);

  // Cleanup WebRTC connection
  const cleanupWebRTC = useCallback(() => {
    unsubsRef.current.forEach(unsub => unsub());
    unsubsRef.current = [];
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsLive(false);
    setPeerState('new');
  }, []);

  // Listen for camera status + fallback snapshot frames
  useEffect(() => {
    if (!userId) return;

    if (prevUserIdRef.current !== userId) {
      setIsDismissed(false);
      setFrame(null);
      setIsActive(false);
      setUpdatedAt(0);
      setIsLive(false);
      cleanupWebRTC();
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
  }, [userId, cleanupWebRTC]);

  // Auto-answer WebRTC call when camera becomes active
  useEffect(() => {
    if (!isActive || !userId || isDismissed) {
      cleanupWebRTC();
      return;
    }

    // Already connected
    if (pcRef.current) return;

    const answerCall = () => {
      // Watch for the patient's offer
      const offerUnsub = onValue(ref(db, `users/${userId}/webrtc/offer`), async (offerSnap) => {
        if (!offerSnap.exists()) return;
        // Don't create a second PC
        if (pcRef.current) return;

        try {
          const pc = new RTCPeerConnection(ICE_CONFIG);
          pcRef.current = pc;

          pc.onconnectionstatechange = () => {
            setPeerState(pc.connectionState);
            if (pc.connectionState === 'connected') setIsLive(true);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setIsLive(false);
            }
          };

          // Receive the patient's video stream
          pc.ontrack = (event) => {
            if (liveVideoRef.current && event.streams[0]) {
              liveVideoRef.current.srcObject = event.streams[0];
              setIsLive(true);
            }
          };

          // Write our ICE candidates to Firebase
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              push(ref(db, `users/${userId}/webrtc/answerCandidates`), event.candidate.toJSON());
            }
          };

          // Set the patient's offer as remote description
          const offer = offerSnap.val();
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          // Read patient's ICE candidates (existing + new)
          const candidateUnsub = onChildAdded(
            ref(db, `users/${userId}/webrtc/offerCandidates`),
            async (snap) => {
              if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(snap.val()));
              } catch { /* ignore late candidates */ }
            }
          );
          unsubsRef.current.push(candidateUnsub);

          // Create our answer and write to Firebase
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(db, `users/${userId}/webrtc/answer`), {
            sdp: answer.sdp,
            type: answer.type,
          });

        } catch (e) {
          console.error('WebRTC answer failed:', e);
        }
      });
      unsubsRef.current.push(offerUnsub);
    };

    answerCall();

    return () => {
      cleanupWebRTC();
    };
  }, [isActive, userId, isDismissed, cleanupWebRTC]);

  // Visibility
  const hasRecentFrame = !!frame && (now - updatedAt < 60000);
  const shouldShow = (isActive || hasRecentFrame) && !isDismissed;

  if (!shouldShow) return null;

  const timeSince = now - updatedAt;

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
              {isLive ? 'SOS — LIVE VIDEO' : isActive ? 'SOS Camera — Connecting...' : 'SOS Camera — Last Frame'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isActive && (
              isLive ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-yellow-400 animate-pulse" />
            )}
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

        {/* Video Feed */}
        <div className={`relative ${isExpanded ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
          {/* Live WebRTC video (hidden when not connected) */}
          <video
            ref={liveVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover absolute inset-0 ${isLive ? '' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Snapshot fallback (shown when WebRTC not connected) */}
          {!isLive && (
            frame ? (
              <img
                src={frame}
                alt="Patient SOS camera"
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A0F0F] text-[#E05252]">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-mono">Connecting to patient camera...</span>
              </div>
            )
          )}

          {/* Status badge */}
          <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full ${
            isLive
              ? 'bg-green-600/80'
              : isActive
                ? 'bg-[#E05252]/80'
                : 'bg-black/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white animate-pulse' : isActive ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
            <span className="text-[8px] text-white font-bold uppercase">
              {isLive ? 'P2P Live' : isActive ? 'Snapshot Feed' : 'Ended'}
            </span>
          </div>

          {/* Timestamp */}
          {updatedAt > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[8px] text-white/70 font-mono">
              {new Date(updatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-3 py-1.5 text-center ${isActive ? 'bg-[#2D1515]' : 'bg-[#2B2515]'}`}>
          <p className={`text-[9px] ${isActive ? 'text-[#E05252]/70' : 'text-[#D4B896]/70'}`}>
            {isLive
              ? '🟢 Live peer-to-peer video connected'
              : isActive && !frame
                ? '🔴 Camera active — establishing connection...'
                : isActive
                  ? `🔴 Snapshot feed — updated ${Math.round(timeSince / 1000)}s ago`
                  : `📷 Camera ended — last frame from ${new Date(updatedAt).toLocaleTimeString()}`
            }
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
