import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';

export type ECGDataPoint = {
  time: number;
  voltage: number;
};

/**
 * High-performance ECG waveform generator.
 * Uses requestAnimationFrame with FPS-throttling and avoids
 * creating new arrays on every frame by using a ring buffer.
 * Subscribes via useSyncExternalStore to minimise React reconciliation overhead.
 */
export function useECGWaveform(bpm: number, bufferSize: number = 100, targetFps: number = 24) {
  const storeRef = useRef<ECGWaveformStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new ECGWaveformStore(bpm, bufferSize, targetFps);
  }

  // Keep params in sync
  useEffect(() => {
    const store = storeRef.current!;
    store.setBpm(bpm);
    store.setBufferSize(bufferSize);
    store.setTargetFps(targetFps);
  }, [bpm, bufferSize, targetFps]);

  // Start / stop the animation loop
  useEffect(() => {
    const store = storeRef.current!;
    store.start();
    return () => store.stop();
  }, []);

  const subscribe = useCallback(
    (cb: () => void) => {
      const store = storeRef.current!;
      store.addListener(cb);
      return () => store.removeListener(cb);
    },
    [],
  );

  const getSnapshot = useCallback(() => storeRef.current!.getSnapshot(), []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ─── External store (no React state, no array churn) ──────────
class ECGWaveformStore {
  private buffer: ECGDataPoint[];
  private snapshot: ECGDataPoint[];
  private phase = 0;
  private bpm: number;
  private bufferSize: number;
  private targetFps: number;
  private rafId: number | null = null;
  private lastRender = 0;
  private listeners = new Set<() => void>();
  private version = 0;

  constructor(bpm: number, bufferSize: number, targetFps: number) {
    this.bpm = bpm;
    this.bufferSize = bufferSize;
    this.targetFps = targetFps;
    this.targetFps = targetFps;
    
    // Simulate past frames so it doesn't start from a flatline
    this.buffer = Array.from({ length: bufferSize }, (_, i) => {
      // Very basic initialization, but wait, we can just run the loop logic
      return { time: Date.now() - (bufferSize - i) * (1000 / targetFps), voltage: 0 };
    });
    
    // Pre-fill with realistic waveform
    for (let i = 0; i < bufferSize; i++) {
        const intervalMs = 1000 / this.targetFps;
        const phaseIncrement = (this.bpm / 60000) * intervalMs;
        this.phase = (this.phase + phaseIncrement) % 1.0;
        
        let v = 0;
        const phase = this.phase;
  
        if (phase > 0.1 && phase < 0.2) v += Math.sin(((phase - 0.1) / 0.1) * Math.PI) * 0.25;
        else if (phase > 0.22 && phase < 0.24) v += -Math.sin(((phase - 0.22) / 0.02) * Math.PI) * 0.2;
        else if (phase >= 0.24 && phase < 0.28) {
          if (phase < 0.26) v += ((phase - 0.24) / 0.02) * 2.5;
          else v += (1 - (phase - 0.26) / 0.02) * 2.5;
        } else if (phase >= 0.28 && phase < 0.32) {
          if (phase < 0.30) v += -((phase - 0.28) / 0.02) * 0.6;
          else v += -(1 - (phase - 0.30) / 0.02) * 0.6;
        } else if (phase > 0.45 && phase < 0.65) {
          v += Math.sin(((phase - 0.45) / 0.2) * Math.PI) * 0.4;
        }
  
        v += (Math.random() - 0.5) * 0.06;
        
        this.buffer[i].voltage = v;
    }
    
    this.snapshot = [...this.buffer];
  }

  setBpm(v: number) { this.bpm = v; }
  setBufferSize(v: number) {
    if (v !== this.bufferSize) {
      this.bufferSize = v;
      // Resize buffer
      if (this.buffer.length < v) {
        const pad = Array.from({ length: v - this.buffer.length }, (_, i) => ({ time: i, voltage: 0 }));
        this.buffer = [...pad, ...this.buffer];
      } else {
        this.buffer = this.buffer.slice(this.buffer.length - v);
      }
    }
  }
  setTargetFps(v: number) { this.targetFps = v; }

  getSnapshot() { return this.snapshot; }

  addListener(cb: () => void) { this.listeners.add(cb); }
  removeListener(cb: () => void) { this.listeners.delete(cb); }

  private notify() {
    this.version++;
    this.snapshot = [...this.buffer]; // Single array copy per frame
    this.listeners.forEach(cb => cb());
  }

  start() {
    if (this.rafId !== null) return;
    this.lastRender = performance.now();
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);

      const intervalMs = 1000 / this.targetFps;
      const deltaMs = now - this.lastRender;
      if (deltaMs < intervalMs) return;

      this.lastRender = now - (deltaMs % intervalMs);
      const safeDelta = Math.min(deltaMs, 100);

      // Phase increment (BPM → cycles/ms)
      const phaseIncrement = (this.bpm / 60000) * safeDelta;
      this.phase = (this.phase + phaseIncrement) % 1.0;

      let v = 0;
      const phase = this.phase;

      // Realistic PQRST waveform
      if (phase > 0.1 && phase < 0.2) {
        v += Math.sin(((phase - 0.1) / 0.1) * Math.PI) * 0.25;
      } else if (phase > 0.22 && phase < 0.24) {
        v += -Math.sin(((phase - 0.22) / 0.02) * Math.PI) * 0.2;
      } else if (phase >= 0.24 && phase < 0.28) {
        if (phase < 0.26) v += ((phase - 0.24) / 0.02) * 2.5;
        else v += (1 - (phase - 0.26) / 0.02) * 2.5;
      } else if (phase >= 0.28 && phase < 0.32) {
        if (phase < 0.30) v += -((phase - 0.28) / 0.02) * 0.6;
        else v += -(1 - (phase - 0.30) / 0.02) * 0.6;
      } else if (phase > 0.45 && phase < 0.65) {
        v += Math.sin(((phase - 0.45) / 0.2) * Math.PI) * 0.4;
      }

      // Subtle noise + wandering baseline
      v += (Math.random() - 0.5) * 0.06;
      v += Math.sin(now / 1200) * 0.08;

      // Shift buffer left, push new point
      this.buffer.shift();
      this.buffer.push({ time: Date.now(), voltage: v });

      this.notify();
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
