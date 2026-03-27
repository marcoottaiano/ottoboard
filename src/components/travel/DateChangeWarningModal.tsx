'use client'

import { AlertTriangle, X } from 'lucide-react'

interface AffectedItem {
  id: string
  day_date: string
  place_nome: string | null
}

interface Props {
  affectedItems: AffectedItem[]
  newDataFine: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

export function DateChangeWarningModal({
  affectedItems,
  newDataFine,
  onConfirm,
  onCancel,
  isLoading,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Modifica date</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-white/60">
            La nuova data di fine ({formatDate(newDataFine)}) è precedente ad alcuni elementi
            dell&apos;itinerario già pianificati. Questi saranno eliminati:
          </p>

          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {affectedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-xs text-white/50 py-1 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-white/30 shrink-0">{formatDate(item.day_date)}</span>
                <span className="text-white/60 truncate">{item.place_nome ?? 'Luogo sconosciuto'}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-amber-400/70">
            Questa azione è irreversibile. Confermi?
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Eliminazione…' : 'Conferma e salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
