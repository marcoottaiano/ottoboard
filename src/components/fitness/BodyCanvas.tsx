'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { ExtendedBodyPart, Slug } from 'react-muscle-highlighter'
import type { BodyMeasurement } from '@/types'
import { PrivacyValue } from '@/components/ui/PrivacyValue'

const Body = dynamic(() => import('./MuscleBody'), { ssr: false })

interface MeasurementInfo {
  field: keyof BodyMeasurement
  label: string
  unit: string
}

interface ZoneDef {
  label: string
  measurements: MeasurementInfo[]
}

const SLUG_ZONES: Partial<Record<Slug, ZoneDef>> = {
  neck: {
    label: 'Collo',
    measurements: [{ field: 'circ_neck', label: 'Circonferenza', unit: 'cm' }],
  },
  chest: {
    label: 'Petto',
    measurements: [
      { field: 'circ_chest', label: 'Circonferenza', unit: 'cm' },
      { field: 'skinfold_chest', label: 'Plica', unit: 'mm' },
    ],
  },
  abs: {
    label: 'Addome / Vita',
    measurements: [
      { field: 'circ_waist', label: 'Vita', unit: 'cm' },
      { field: 'skinfold_abdomen', label: 'Plica addome', unit: 'mm' },
    ],
  },
  obliques: {
    label: 'Obliqui / Fianchi',
    measurements: [
      { field: 'circ_waist', label: 'Vita', unit: 'cm' },
      { field: 'skinfold_suprailiac', label: 'Plica soprailiaca', unit: 'mm' },
      { field: 'skinfold_midaxillary', label: 'Plica ascellare', unit: 'mm' },
    ],
  },
  gluteal: {
    label: 'Glutei / Fianchi',
    measurements: [{ field: 'circ_hip', label: 'Fianchi', unit: 'cm' }],
  },
  adductors: {
    label: 'Fianchi',
    measurements: [{ field: 'circ_hip', label: 'Fianchi', unit: 'cm' }],
  },
  biceps: {
    label: 'Braccio',
    measurements: [{ field: 'circ_arm', label: 'Circonferenza', unit: 'cm' }],
  },
  triceps: {
    label: 'Tricipite / Braccio',
    measurements: [
      { field: 'circ_arm', label: 'Circonferenza', unit: 'cm' },
      { field: 'skinfold_tricep', label: 'Plica tricipite', unit: 'mm' },
    ],
  },
  forearm: {
    label: 'Avambraccio',
    measurements: [{ field: 'circ_forearm', label: 'Circonferenza', unit: 'cm' }],
  },
  quadriceps: {
    label: 'Coscia',
    measurements: [
      { field: 'circ_thigh', label: 'Circonferenza', unit: 'cm' },
      { field: 'skinfold_thigh', label: 'Plica coscia', unit: 'mm' },
    ],
  },
  hamstring: {
    label: 'Coscia (posteriore)',
    measurements: [{ field: 'circ_thigh', label: 'Circonferenza', unit: 'cm' }],
  },
  calves: {
    label: 'Polpaccio',
    measurements: [{ field: 'circ_calf', label: 'Circonferenza', unit: 'cm' }],
  },
  'upper-back': {
    label: 'Schiena superiore',
    measurements: [{ field: 'skinfold_subscapular', label: 'Plica sottoscapolare', unit: 'mm' }],
  },
}

interface Props {
  measurements: BodyMeasurement[]
}

export function BodyCanvas({ measurements }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [selected, setSelected] = useState<Slug | null>(null)

  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  const getValue = (field: keyof BodyMeasurement) =>
    latest?.[field] as number | undefined

  const getDelta = (field: keyof BodyMeasurement): number | null => {
    const curr = latest?.[field] as number | undefined
    const prev = previous?.[field] as number | undefined
    if (curr == null || prev == null) return null
    return Math.round((curr - prev) * 10) / 10
  }

  // Build the set of slugs that have at least one measurement value
  const highlighted = new Set<Slug>()
  if (latest) {
    if (latest.circ_neck != null)            highlighted.add('neck')
    if (latest.circ_chest != null || latest.skinfold_chest != null) highlighted.add('chest')
    if (latest.circ_waist != null || latest.skinfold_abdomen != null) highlighted.add('abs')
    if (latest.circ_waist != null || latest.skinfold_suprailiac != null || latest.skinfold_midaxillary != null) highlighted.add('obliques')
    if (latest.circ_hip != null)             { highlighted.add('gluteal'); highlighted.add('adductors') }
    if (latest.circ_arm != null)             { highlighted.add('biceps'); highlighted.add('triceps') }
    if (latest.skinfold_tricep != null)      highlighted.add('triceps')
    if (latest.circ_forearm != null)         highlighted.add('forearm')
    if (latest.circ_thigh != null || latest.skinfold_thigh != null) { highlighted.add('quadriceps'); highlighted.add('hamstring') }
    if (latest.circ_calf != null)            highlighted.add('calves')
    if (latest.skinfold_subscapular != null) highlighted.add('upper-back')
  }

  const data: ReadonlyArray<ExtendedBodyPart> = Array.from(highlighted).map(slug => ({
    slug,
    color: '#f97316',
  }))

  const handlePress = (part: ExtendedBodyPart) => {
    const slug = part.slug as Slug
    if (!slug || !SLUG_ZONES[slug]) return
    setSelected(prev => (prev === slug ? null : slug))
  }

  const selectedZone = selected ? SLUG_ZONES[selected] : null

  return (
    <div className="flex flex-col items-center gap-3">
      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 text-xs">
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setSelected(null) }}
            className={`px-3 py-1 rounded-md transition-colors ${
              view === v ? 'bg-orange-500/30 text-orange-300' : 'text-gray-400 hover:text-white'
            }`}
          >
            {v === 'front' ? 'Anteriore' : 'Posteriore'}
          </button>
        ))}
      </div>

      {/* Body figure */}
      <div className="flex justify-center">
        <Body
          data={data}
          side={view}
          gender="male"
          scale={0.7}
          colors={['#f97316', '#fb923c']}
          defaultFill="#1e3448"
          defaultStroke="#2d5070"
          defaultStrokeWidth={0.5}
          border="#2d5070"
          onBodyPartPress={handlePress}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500/40 border border-orange-500/60" />
          Con dato
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#1e3448] border border-[#2d5070]" />
          Nessun dato
        </span>
        <span className="text-gray-600">Tocca per dettagli</span>
      </div>

      {/* Selected zone info card */}
      {selectedZone && (
        <div className="w-full rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-orange-300">{selectedZone.label}</p>
          <div className="space-y-1.5">
            {selectedZone.measurements.map(m => {
              const val = getValue(m.field)
              const delta = getDelta(m.field)
              return (
                <div key={m.field as string} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{m.label}</span>
                  {val != null ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-white font-medium"><PrivacyValue>{val} {m.unit}</PrivacyValue></span>
                      {delta !== null && (
                        <span className={
                          delta > 0 ? 'text-green-400' :
                          delta < 0 ? 'text-red-400' : 'text-gray-400'
                        }>
                          <PrivacyValue>{delta > 0 ? '+' : ''}{delta}</PrivacyValue>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </div>
              )
            })}
          </div>
          {latest?.measured_at && (
            <p className="text-[10px] text-gray-600 pt-0.5">Ultima misurazione: {latest.measured_at}</p>
          )}
        </div>
      )}
    </div>
  )
}
