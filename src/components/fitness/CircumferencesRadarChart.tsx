'use client'

import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { BodyMeasurement } from '@/types'
import { usePrivacyMode } from '@/hooks/usePrivacyMode'

interface Props {
  measurements: BodyMeasurement[]
}

const CIRC_FIELDS: { field: keyof BodyMeasurement; label: string }[] = [
  { field: 'circ_neck',    label: 'Collo' },
  { field: 'circ_chest',   label: 'Petto' },
  { field: 'circ_arm',     label: 'Braccio' },
  { field: 'circ_forearm', label: 'Avambraccio' },
  { field: 'circ_waist',   label: 'Vita' },
  { field: 'circ_hip',     label: 'Fianchi' },
  { field: 'circ_thigh',   label: 'Coscia' },
  { field: 'circ_calf',    label: 'Polpaccio' },
]

export function CircumferencesRadarChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode()
  const withCirc = measurements.filter(m =>
    CIRC_FIELDS.some(f => m[f.field] != null)
  )

  const [dateA, setDateA] = useState<string>(withCirc[0]?.measured_at ?? '')
  const [dateB, setDateB] = useState<string>(withCirc[1]?.measured_at ?? '')

  if (withCirc.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-48">
        <p className="text-xs text-gray-500">Nessuna circonferenza disponibile</p>
      </div>
    )
  }

  const mA = withCirc.find(m => m.measured_at === dateA)
  const mB = withCirc.find(m => m.measured_at === dateB)

  // Calcola max per normalizzazione
  const maxValues: Record<string, number> = {}
  CIRC_FIELDS.forEach(({ field, label }) => {
    const vals = withCirc.map(m => m[field] as number | undefined).filter(Boolean) as number[]
    maxValues[label] = vals.length ? Math.max(...vals) : 1
  })

  const radarData = CIRC_FIELDS.map(({ field, label }) => ({
    subject: label,
    A: mA?.[field] != null ? Math.round(((mA[field] as number) / maxValues[label]) * 100) : null,
    B: mB?.[field] != null ? Math.round(((mB[field] as number) / maxValues[label]) * 100) : null,
    rawA: mA?.[field],
    rawB: mB?.[field],
  }))

  const dateOptions = withCirc.map(m => m.measured_at)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Radar circonferenze</h3>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <select
              value={dateA}
              onChange={e => setDateA(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white text-xs focus:outline-none"
            >
              {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {dateOptions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <select
                value={dateB}
                onChange={e => setDateB(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white text-xs focus:outline-none"
              >
                <option value="">—</option>
                {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={dateA}
            dataKey="A"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {mB && (
            <Radar
              name={dateB}
              dataKey="B"
              stroke="#14b8a6"
              fill="#14b8a6"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          )}
          <Tooltip
            contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            formatter={(_v, _name, props) => {
              const raw = _name === dateA
                ? (props.payload as { rawA?: number })?.rawA
                : (props.payload as { rawB?: number })?.rawB
              if (isPrivate) return raw != null ? ['•••• cm', String(_name)] : ['—', String(_name)]
              return raw != null ? [`${raw} cm`, String(_name)] : ['—', String(_name)]
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
