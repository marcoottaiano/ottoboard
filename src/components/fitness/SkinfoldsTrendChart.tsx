'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
}

const SITES: { field: keyof BodyMeasurement; label: string; color: string }[] = [
  { field: 'skinfold_chest',       label: 'Petto',          color: '#f97316' },
  { field: 'skinfold_abdomen',     label: 'Addome',         color: '#fb923c' },
  { field: 'skinfold_thigh',       label: 'Coscia',         color: '#fdba74' },
  { field: 'skinfold_tricep',      label: 'Tricipite',      color: '#14b8a6' },
  { field: 'skinfold_suprailiac',  label: 'Soprailiaca',    color: '#2dd4bf' },
  { field: 'skinfold_subscapular', label: 'Sottoscapolare', color: '#5eead4' },
  { field: 'skinfold_midaxillary', label: 'Ascellare',      color: '#a78bfa' },
]

export function SkinfoldsTrendChart({ measurements }: Props) {
  const [showIndividual, setShowIndividual] = useState(false)

  const filtered = [...measurements]
    .filter(m => SITES.some(s => m[s.field] != null))
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Nessuna plicometria disponibile</p>
      </div>
    )
  }

  const data = filtered.map(m => {
    const vals = SITES.map(s => m[s.field] as number | undefined).filter(Boolean) as number[]
    const sum = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0)) : null
    const row: Record<string, string | number | null> = { date: m.measured_at.slice(5), sum }
    SITES.forEach(s => { row[s.field as string] = (m[s.field] as number | undefined) ?? null })
    return row
  })

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Pliche nel tempo</h3>
        <button
          onClick={() => setShowIndividual(v => !v)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {showIndividual ? 'Mostra somma' : 'Dettaglio siti'}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `${v}`} />
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${v} mm`, name === 'sum' ? 'Σ pliche' : String(name)]}
            labelStyle={{ color: '#9ca3af' }}
          />
          {!showIndividual ? (
            <Line
              type="monotone"
              dataKey="sum"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316' }}
              connectNulls
            />
          ) : (
            SITES.map(s => (
              <Line
                key={s.field as string}
                type="monotone"
                dataKey={s.field as string}
                stroke={s.color}
                strokeWidth={1.5}
                dot={false}
                name={s.label}
                connectNulls
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
