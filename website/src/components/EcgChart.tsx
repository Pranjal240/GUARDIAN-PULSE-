'use client'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

interface EcgChartProps {
  data: number[]
  height?: number
  showAxes?: boolean
  color?: string
  status?: 'normal' | 'warning' | 'critical'
}

const STATUS_COLORS = {
  normal: '#5CB85C',
  warning: '#E8A838',
  critical: '#E05252',
}

export default function EcgChart({ data, height = 80, showAxes = false, color, status = 'normal' }: EcgChartProps) {
  const lineColor = color ?? STATUS_COLORS[status]
  const chartData = data.map((v, i) => ({ i, v }))

  if (data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-[#6B7F67] text-xs">
        No data
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <div style={{ width: '100%', height: '100%', minHeight: '80px', minWidth: '100px' }}>
        <ResponsiveContainer width="100%" height={240} minWidth={100}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: showAxes ? 20 : 0 }}>
            {showAxes && (
              <>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,184,150,0.08)" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fill: '#A8B5A2', fontSize: 10 }} width={28} />
                <Tooltip
                  contentStyle={{ background: '#2A3D2E', border: '1px solid rgba(212,184,150,0.2)', borderRadius: 8, color: '#F2E8D9', fontSize: 12 }}
                  labelStyle={{ display: 'none' }}
                  formatter={(v: any) => [Number(v).toFixed(0), 'ECG']}
                />
              </>
            )}
            <Line
              type="monotone"
              dataKey="v"
              stroke={lineColor}
              strokeWidth={showAxes ? 2 : 1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
