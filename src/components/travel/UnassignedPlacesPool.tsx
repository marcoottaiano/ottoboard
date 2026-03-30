'use client'

import { useState, useMemo } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { MapPin, Utensils, Landmark, Coffee, Search } from 'lucide-react'
import type { TripPlace, PlaceTipo } from '@/types/travel'

const TIPO_ICON: Record<PlaceTipo, React.ReactNode> = {
  ristorante: <Utensils size={11} />,
  bar: <Coffee size={11} />,
  attrazione: <Landmark size={11} />,
}

const TIPO_COLOR: Record<PlaceTipo, string> = {
  ristorante: 'text-orange-400 bg-orange-400/10',
  bar: 'text-yellow-400 bg-yellow-400/10',
  attrazione: 'text-purple-400 bg-purple-400/10',
}

interface PlaceCardProps {
  place: TripPlace
}

function DraggablePlaceCard({ place }: PlaceCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool:${place.id}`,
    data: { placeId: place.id, sourceType: 'pool' as const },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-grab active:cursor-grabbing select-none touch-none transition-all',
        isDragging
          ? 'opacity-40 border-white/20 bg-white/[0.06]'
          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14]',
      ].join(' ')}
    >
      <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] shrink-0 ${TIPO_COLOR[place.tipo]}`}>
        {TIPO_ICON[place.tipo]}
      </span>
      <span className="text-xs text-white/80 truncate">{place.nome}</span>
    </div>
  )
}

const TIPO_OPTIONS: { value: PlaceTipo | 'tutti'; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'attrazione', label: 'Attrazioni' },
  { value: 'ristorante', label: 'Ristoranti' },
  { value: 'bar', label: 'Bar' },
]

interface Props {
  places: TripPlace[]
}

export function UnassignedPlacesPool({ places }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<PlaceTipo | 'tutti'>('tutti')

  const filtered = useMemo(() => {
    let result = places
    if (tipoFilter !== 'tutti') {
      result = result.filter((p) => p.tipo === tipoFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.nome.toLowerCase().includes(q))
    }
    return result
  }, [places, tipoFilter, search])

  return (
    <div
      ref={setNodeRef}
      className={[
        'rounded-xl border p-3 transition-colors min-h-[120px]',
        isOver
          ? 'border-red-500/40 bg-red-500/[0.04]'
          : 'border-white/[0.08] bg-white/[0.02]',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <MapPin size={12} className="text-white/30" />
        <span className="text-[11px] font-medium text-white/30 uppercase tracking-wide">
          Luoghi ({places.length})
        </span>
      </div>

      {/* Search + filter */}
      <div className="flex gap-1.5 mb-2.5">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-6 pr-2 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as PlaceTipo | 'tutti')}
          className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1.5 text-[11px] text-white/60 focus:outline-none focus:border-white/20 transition-colors cursor-pointer"
        >
          {TIPO_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value} className="bg-neutral-900 text-white">
              {label}
            </option>
          ))}
        </select>
      </div>

      {places.length === 0 ? (
        <p className="text-[11px] text-white/20 text-center py-4">
          Nessun luogo aggiunto al viaggio.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-[11px] text-white/20 text-center py-4">
          Nessun risultato.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((place) => (
            <DraggablePlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      {isOver && (
        <p className="text-[11px] text-red-400 text-center mt-2">
          Rilascia per rimuovere dall&apos;itinerario
        </p>
      )}
    </div>
  )
}
