'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { MapPin, Utensils, Landmark, Coffee } from 'lucide-react'
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

interface Props {
  places: TripPlace[]
}

export function UnassignedPlacesPool({ places }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })

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

      {places.length === 0 ? (
        <p className="text-[11px] text-white/20 text-center py-4">
          Nessun luogo aggiunto al viaggio.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {places.map((place) => (
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
