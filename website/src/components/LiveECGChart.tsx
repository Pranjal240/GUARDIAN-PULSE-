import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip } from 'recharts';
import { useECGWaveform } from '@/hooks/useECGWaveform';

type LiveECGChartProps = {
  bpm: number;
  height?: number | string;
  color?: string;
  bufferSize?: number;
};

export default function LiveECGChart({ 
  bpm, 
  height = 240, 
  color = '#4CAF78', // Default Medical Green
  bufferSize = 100 
}: LiveECGChartProps) {
  const data = useECGWaveform(bpm, bufferSize, 24);

  return (
    <div style={{ width: '100%', height, minHeight: '80px', minWidth: '100px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="liveEcgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            
            {/* Soft Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
               <feGaussianBlur stdDeviation="2" result="blur" />
               <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* We lock the domain to safely fit the PQRST structure: -1 to 3 volts normally */}
          <YAxis domain={[-1.5, 3.5]} hide />
          <Tooltip 
             contentStyle={{ background: '#1C2B1E', border: `1px solid ${color}`, borderRadius: '12px', color: '#F0E6D3', fontSize: '12px' }}
             itemStyle={{ color: '#F0E6D3', fontFamily: 'JetBrains Mono', fontWeight: 'bold' }}
             labelFormatter={() => 'Simulated Live Voltage'}
             formatter={(value: unknown) => [typeof value === 'number' ? value.toFixed(2) + ' mV' : '-- mV', 'Voltage']}
             isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="voltage" 
            stroke={color} 
            strokeWidth={2.5} 
            fill="url(#liveEcgGrad)" 
            dot={false} 
            isAnimationActive={false} 
            style={{ filter: 'url(#glow)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
