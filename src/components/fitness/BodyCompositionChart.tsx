'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
}

export function BodyCompositionChart({ measurements }: Props) {
  const filtered = [...measurements]
    .filter(m => m.fat_mass_kg != null && m.lean_mass_kg != null)
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Inserisci peso + pliche per vedere la composizione</p>
      </div>
    )
  }

  const data = filtered.map(m => ({
    date: m.measured_at.slice(5),
    grassa: m.fat_mass_kg,
    magra: m.lean_mass_kg,
  }))

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Composizione corporea</h3>
        <div className="flex gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-teal-500/60" />Massa magra
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-orange-500/60" />Massa grassa
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gradMagra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradGrassa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${v}`} />
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v} kg`, name === 'magra' ? 'Massa magra' : 'Massa grassa']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Area
            type="monotone"
            dataKey="magra"
            stackId="1"
            stroke="#14b8a6"
            fill="url(#gradMagra)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="grassa"
            stackId="1"
            stroke="#f97316"
            fill="url(#gradGrassa)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
