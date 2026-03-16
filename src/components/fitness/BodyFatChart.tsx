'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { BodyMeasurement, UserBodyProfile } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
  profile: UserBodyProfile | null
}

// Fasce di riferimento per % grasso
const MALE_ZONES = [
  { value: 6,  label: 'Atleta', color: '#22c55e' },
  { value: 13, label: 'Forma', color: '#84cc16' },
  { value: 17, label: 'Normale', color: '#f59e0b' },
  { value: 25, label: 'Alto', color: '#ef4444' },
]
const FEMALE_ZONES = [
  { value: 14, label: 'Atleta', color: '#22c55e' },
  { value: 20, label: 'Forma', color: '#84cc16' },
  { value: 24, label: 'Normale', color: '#f59e0b' },
  { value: 31, label: 'Alto', color: '#ef4444' },
]

export function BodyFatChart({ measurements, profile }: Props) {
  const filtered = [...measurements]
    .filter(m => m.body_fat_pct != null)
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Nessun dato % grasso disponibile</p>
      </div>
    )
  }

  const data = filtered.map(m => ({
    date: m.measured_at.slice(5),
    grasso: m.body_fat_pct,
  }))

  const zones = profile?.sex === 'female' ? FEMALE_ZONES : MALE_ZONES

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">% Grasso corporeo</h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`${v}%`, '% Grasso']}
            labelStyle={{ color: '#9ca3af' }}
          />
          {zones.map(z => (
            <ReferenceLine
              key={z.label}
              y={z.value}
              stroke={z.color}
              strokeDasharray="4 2"
              strokeOpacity={0.5}
              label={{ value: z.label, position: 'right', fontSize: 9, fill: z.color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="grasso"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f97316' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
