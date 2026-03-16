'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
}

function movingAverage(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null
    const slice = data.slice(i - window + 1, i + 1)
    return Math.round((slice.reduce((a, b) => a + b, 0) / window) * 10) / 10
  })
}

export function WeightChart({ measurements }: Props) {
  const filtered = [...measurements]
    .filter(m => m.weight_kg != null)
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Nessun dato peso disponibile</p>
      </div>
    )
  }

  const weights = filtered.map(m => m.weight_kg!)
  const maValues = movingAverage(weights, Math.min(7, filtered.length))

  const data = filtered.map((m, i) => ({
    date: m.measured_at.slice(5), // MM-DD
    peso: m.weight_kg,
    media: maValues[i],
  }))

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Peso nel tempo</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={v => `${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v} kg`, name === 'peso' ? 'Peso' : 'Media 7gg']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f97316' }}
            name="peso"
          />
          <Line
            type="monotone"
            dataKey="media"
            stroke="#fb923c"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="media"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
