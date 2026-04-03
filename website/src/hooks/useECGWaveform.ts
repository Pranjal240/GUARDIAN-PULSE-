import { useState, useEffect, useRef } from 'react';

export type ECGDataPoint = {
  time: number;
  voltage: number;
};

export function useECGWaveform(bpm: number, bufferSize: number = 100, targetFps: number = 24) {
  const [data, setData] = useState<ECGDataPoint[]>([]);
  const phaseRef = useRef(0);
  const dataRef = useRef<ECGDataPoint[]>(
    Array.from({ length: bufferSize }, (_, i) => ({ time: i, voltage: 0 }))
  );

  useEffect(() => {
    // Only set initial data once if it's empty
    if (data.length === 0) {
      setData(dataRef.current);
    }
    
    const intervalMs = 1000 / targetFps;
    let animationFrameId: number;
    let lastRender = performance.now();

    function render(now: number) {
      animationFrameId = requestAnimationFrame(render);

      const deltaMs = now - lastRender;
      if (deltaMs >= intervalMs) {
        lastRender = now - (deltaMs % intervalMs);

        const safeDelta = Math.min(deltaMs, 100);

        // Calculate phase change
        // At 60 BPM (1 cycle per second), there is 1 cycle every 1000ms.
        // So phase increment is safeDelta * (bpm / 60000).
        const phaseIncrement = (bpm / 60000) * safeDelta;
        phaseRef.current = (phaseRef.current + phaseIncrement) % 1.0;

        const phase = phaseRef.current;
        let v = 0;

        // Realistic PQRST Approximation
        if (phase > 0.1 && phase < 0.2) {
          // P Wave
          v += Math.sin(((phase - 0.1) / 0.1) * Math.PI) * 0.25;
        } else if (phase > 0.22 && phase < 0.24) {
          // Q Dip
          v += -Math.sin(((phase - 0.22) / 0.02) * Math.PI) * 0.2;
        } else if (phase >= 0.24 && phase < 0.28) {
          // R Spike
          if (phase < 0.26) v += ((phase - 0.24) / 0.02) * 2.5;
          else v += (1 - (phase - 0.26) / 0.02) * 2.5;
        } else if (phase >= 0.28 && phase < 0.32) {
          // S Dip
          if (phase < 0.30) v += -((phase - 0.28) / 0.02) * 0.6;
          else v += -(1 - (phase - 0.30) / 0.02) * 0.6;
        } else if (phase > 0.45 && phase < 0.65) {
          // T Wave
          v += Math.sin(((phase - 0.45) / 0.2) * Math.PI) * 0.4;
        }

        // Add small high-freq noise + low-freq wandering baseline
        const noise = (Math.random() - 0.5) * 0.08;
        const wander = Math.sin(now / 1000) * 0.1;
        v += noise + wander;

        const newBuffer = [...dataRef.current.slice(1), { time: Date.now(), voltage: v }];
        dataRef.current = newBuffer;
        
        setData([...newBuffer]); // Trigger re-render
      }
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bpm, targetFps, bufferSize]);

  return data;
}
