'use client'
import { useEffect, useRef } from 'react'

interface BpmDisplayProps {
  bpm: number
  large?: boolean
}

function getBpmColor(bpm: number) {
  if (bpm === 0) return '#A8B5A2'
  if (bpm >= 130 || bpm < 50) return '#E05252'
  if (bpm >= 100 || bpm < 60) return '#E8A838'
  return '#5CB85C'
}

export default function BpmDisplay({ bpm, large = false }: BpmDisplayProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.animation = 'none'
      void ref.current.offsetHeight
      ref.current.style.animation = 'bpmFlash 0.6s ease-in-out'
    }
  }, [bpm])

  const color = getBpmColor(bpm)
  const fontSize = large ? 'text-7xl' : 'text-2xl'

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        ref={ref}
        className={`font-mono-data ${fontSize} font-bold transition-colors duration-300`}
        style={{ color }}
      >
        {bpm === 0 ? '--' : bpm}
      </span>
      <span className="text-[#A8B5A2] text-xs">BPM</span>
      {bpm > 0 && (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          bpm >= 130 || bpm < 50
            ? 'badge-critical'
            : bpm >= 100 || bpm < 60
            ? 'badge-warning'
            : 'badge-normal'
        }`}>
          {bpm >= 130 ? 'TACHYCARDIA' : bpm < 50 ? 'BRADYCARDIA' : bpm >= 100 ? 'ELEVATED' : bpm < 60 ? 'LOW' : 'NORMAL'}
        </span>
      )}
    </div>
  )
}
