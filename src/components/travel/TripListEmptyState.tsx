'use client'

import { Plane, Plus } from 'lucide-react'

interface Props {
  onCreateClick: () => void
}

export function TripListEmptyState({ onCreateClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
        <Plane size={28} className="text-blue-400/60" />
      </div>
      <h2 className="text-base font-semibold text-white/70 mb-1">Nessun viaggio</h2>
      <p className="text-sm text-white/30 mb-6 max-w-xs">
        Inizia a pianificare il tuo prossimo viaggio in un&apos;unica schermata.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-200 text-sm font-medium"
      >
        <Plus size={15} />
        Crea il tuo primo viaggio
      </button>
    </div>
  )
}
