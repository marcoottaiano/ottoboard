'use client'

import { useState } from 'react'
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDeleteBodyMeasurement } from '@/hooks/useBodyMeasurements'
import type { BodyMeasurement } from '@/types'
import { PrivacyValue } from '@/components/ui/PrivacyValue'

const PAGE_SIZE = 20

interface DetailModalProps {
  m: BodyMeasurement
  onClose: () => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

function DetailModal({ m, onClose, onDelete, isDeleting }: DetailModalProps) {
  const fields: { label: string; value: number | undefined; unit: string }[] = [
    { label: 'Peso',           value: m.weight_kg,          unit: 'kg' },
    { label: '% Grasso',       value: m.body_fat_pct,       unit: '%' },
    { label: 'Massa magra',    value: m.lean_mass_kg,       unit: 'kg' },
    { label: 'Massa grassa',   value: m.fat_mass_kg,        unit: 'kg' },
    { label: 'Vita',           value: m.circ_waist,         unit: 'cm' },
    { label: 'Fianchi',        value: m.circ_hip,           unit: 'cm' },
    { label: 'Petto (circ.)',  value: m.circ_chest,         unit: 'cm' },
    { label: 'Braccio',        value: m.circ_arm,           unit: 'cm' },
    { label: 'Avambraccio',    value: m.circ_forearm,       unit: 'cm' },
    { label: 'Coscia',         value: m.circ_thigh,         unit: 'cm' },
    { label: 'Polpaccio',      value: m.circ_calf,          unit: 'cm' },
    { label: 'Collo',          value: m.circ_neck,          unit: 'cm' },
    { label: 'Plica petto',    value: m.skinfold_chest,     unit: 'mm' },
    { label: 'Plica addome',   value: m.skinfold_abdomen,   unit: 'mm' },
    { label: 'Plica coscia',   value: m.skinfold_thigh,     unit: 'mm' },
    { label: 'Plica tricipite',value: m.skinfold_tricep,    unit: 'mm' },
    { label: 'Plica soprailiaca', value: m.skinfold_suprailiac, unit: 'mm' },
    { label: 'Plica sottoscapolare', value: m.skinfold_subscapular, unit: 'mm' },
    { label: 'Plica ascellare',value: m.skinfold_midaxillary, unit: 'mm' },
  ].filter(f => f.value != null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-[#12121f] border border-white/10 rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Sessione {m.measured_at}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-[10px] text-gray-500">{f.label}</p>
              <p className="text-sm text-white font-medium"><PrivacyValue>{f.value} {f.unit}</PrivacyValue></p>
            </div>
          ))}
        </div>
        <button
          onClick={() => onDelete(m.id)}
          disabled={isDeleting}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          <Trash2 size={13} />
          {isDeleting ? 'Eliminazione...' : 'Elimina sessione'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  measurements: BodyMeasurement[]
}

export function MeasurementHistoryTable({ measurements }: Props) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<BodyMeasurement | null>(null)
  const deleteMeasurement = useDeleteBodyMeasurement()

  const totalPages = Math.ceil(measurements.length / PAGE_SIZE)
  const pageData = measurements.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDelete = async (id: string) => {
    await deleteMeasurement.mutateAsync(id)
    setSelected(null)
  }

  if (measurements.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center h-24">
        <p className="text-xs text-gray-500">Nessuna sessione registrata</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Data</th>
                <th className="text-right px-3 py-3 text-gray-400 font-medium">Peso</th>
                <th className="text-right px-3 py-3 text-gray-400 font-medium">% Grasso</th>
                <th className="text-right px-3 py-3 text-gray-400 font-medium">Massa magra</th>
                <th className="text-right px-3 py-3 text-gray-400 font-medium hidden sm:table-cell">Σ Pliche</th>
                <th className="text-right px-3 py-3 text-gray-400 font-medium hidden sm:table-cell">Vita</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((m) => {
                const sumPliche = [
                  m.skinfold_chest, m.skinfold_abdomen, m.skinfold_thigh,
                  m.skinfold_tricep, m.skinfold_suprailiac, m.skinfold_subscapular, m.skinfold_midaxillary,
                ].filter(Boolean).reduce((a, b) => (a ?? 0) + (b ?? 0), 0)
                return (
                  <tr
                    key={m.id}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setSelected(m)}
                  >
                    <td className="px-4 py-3 text-gray-300">{m.measured_at}</td>
                    <td className="px-3 py-3 text-right text-white"><PrivacyValue>{m.weight_kg != null ? `${m.weight_kg} kg` : '—'}</PrivacyValue></td>
                    <td className="px-3 py-3 text-right text-orange-300"><PrivacyValue>{m.body_fat_pct != null ? `${m.body_fat_pct}%` : '—'}</PrivacyValue></td>
                    <td className="px-3 py-3 text-right text-teal-300"><PrivacyValue>{m.lean_mass_kg != null ? `${m.lean_mass_kg} kg` : '—'}</PrivacyValue></td>
                    <td className="px-3 py-3 text-right text-gray-300 hidden sm:table-cell"><PrivacyValue>{sumPliche ? `${sumPliche} mm` : '—'}</PrivacyValue></td>
                    <td className="px-3 py-3 text-right text-gray-300 hidden sm:table-cell"><PrivacyValue>{m.circ_waist != null ? `${m.circ_waist} cm` : '—'}</PrivacyValue></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, measurements.length)} di {measurements.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-gray-400"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-gray-400"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          m={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          isDeleting={deleteMeasurement.isPending}
        />
      )}
    </>
  )
}
