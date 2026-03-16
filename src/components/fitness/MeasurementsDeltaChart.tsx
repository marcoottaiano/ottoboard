'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { BodyMeasurement } from '@/types'

interface Props {
  measurements: BodyMeasurement[]
}

// true = un valore che CALA è positivo (es. vita, fianchi, grasso)
// false = un valore che CRESCE è positivo (es. braccio, coscia, massa magra)
const METRICS: { field: keyof BodyMeasurement; label: string; lowerIsBetter: boolean }[] = [
  { field: 'circ_waist',   label: 'Vita',          lowerIsBetter: true },
  { field: 'circ_hip',     label: 'Fianchi',        lowerIsBetter: true },
  { field: 'circ_arm',     label: 'Braccio',        lowerIsBetter: false },
  { field: 'circ_thigh',   label: 'Coscia',         lowerIsBetter: false },
  { field: 'circ_calf',    label: 'Polpaccio',      lowerIsBetter: false },
  { field: 'circ_chest',   label: 'Petto',          lowerIsBetter: false },
  { field: 'lean_mass_kg', label: 'Massa magra',    lowerIsBetter: false },
  { field: 'fat_mass_kg',  label: 'Massa grassa',   lowerIsBetter: true },
  { field: 'weight_kg',    label: 'Peso',           lowerIsBetter: true },
]

export function MeasurementsDeltaChart({ measurements }: Props) {
  const sorted = [...measurements].reverse() // ASC
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  if (!first || first === last) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Servono almeno 2 sessioni per vedere le variazioni</p>
      </div>
    )
  }

  const data = METRICS.flatMap(({ field, label, lowerIsBetter }) => {
    const v0 = first[field] as number | undefined
    const v1 = last[field] as number | undefined
    if (v0 == null || v1 == null) return []
    const delta = Math.round((v1 - v0) * 10) / 10
    if (delta === 0) return []
    const isGood = lowerIsBetter ? delta < 0 : delta > 0
    return [{ label, delta, isGood }]
  })

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Nessuna variazione tra la prima e l&apos;ultima sessione</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Variazioni dalla prima sessione</h3>
        <span className="text-[10px] text-gray-500">{first.measured_at} → {last.measured_at}</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 60, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} width={56} />
          <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`${Number(v) > 0 ? '+' : ''}${v}`, 'Variazione']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Bar dataKey="delta" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isGood ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
