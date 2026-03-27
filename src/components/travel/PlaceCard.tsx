'use client'

import { ExternalLink, Pencil } from 'lucide-react'
import type { TripPlace, PlaceTipo } from '@/types/travel'

const TIPO_LABELS: Record<PlaceTipo, string> = {
  ristorante: 'Ristorante',
  bar: 'Bar',
  attrazione: 'Attrazione',
}

const TIPO_COLORS: Record<PlaceTipo, string> = {
  ristorante: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  bar: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  attrazione: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

interface Props {
  place: TripPlace
  onEdit: () => void
}

export function PlaceCard({ place, onEdit }: Props) {
  return (
    <div
      className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.10] transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIPO_COLORS[place.tipo]}`}
          >
            {TIPO_LABELS[place.tipo]}
          </span>
          {place.prezzo_per_persona != null && (
            <span className="text-[11px] text-white/40">
              €{place.prezzo_per_persona.toFixed(2)} / pers
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-white/90 truncate">{place.nome}</p>
        {place.descrizione && (
          <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{place.descrizione}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {place.maps_url && (
          <a
            href={place.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
            title="Apri in Maps"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          title="Modifica"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  )
}
