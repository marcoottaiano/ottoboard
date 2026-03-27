'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { X, Clock, Hotel } from 'lucide-react'
import type { TripItineraryItem, TripPlace, TripAccommodation, TimeSlot } from '@/types/travel'
import { useSetExactTime, useRemoveItineraryItem } from '@/hooks/useTripItinerary'

export const TIME_SLOTS: TimeSlot[] = [
  'colazione',
  'mattina',
  'pranzo',
  'pomeriggio',
  'cena',
  'sera',
]

const SLOT_LABEL: Record<TimeSlot, string> = {
  colazione: 'Colazione',
  mattina: 'Mattina',
  pranzo: 'Pranzo',
  pomeriggio: 'Pomeriggio',
  cena: 'Cena',
  sera: 'Sera',
}

const SLOT_COLOR: Record<TimeSlot, string> = {
  colazione: 'text-yellow-400/60',
  mattina: 'text-sky-400/60',
  pranzo: 'text-orange-400/60',
  pomeriggio: 'text-amber-400/60',
  cena: 'text-rose-400/60',
  sera: 'text-indigo-400/60',
}

/** Virtual accommodation event (derived, not stored in DB) */
export interface AccommodationEvent {
  id: string          // synthetic: `acc-checkin-${acc.id}` or `acc-checkout-${acc.id}`
  accommodation: TripAccommodation
  eventType: 'checkin' | 'checkout'
  timeSlot: TimeSlot
}

interface SlotItemProps {
  item: TripItineraryItem
  place: TripPlace | undefined
  tripId: string
}

function DraggableSlotItem({ item, place, tripId }: SlotItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot:${item.id}`,
    data: {
      itemId: item.id,
      sourceSlot: item.time_slot,
      sourceDay: item.day_date,
      sourceType: 'slot' as const,
    },
  })

  const removeItem = useRemoveItineraryItem()
  const setExactTime = useSetExactTime()

  // Controlled time input state — syncs from external refetch
  const [localTime, setLocalTime] = useState(item.orario_preciso?.slice(0, 5) ?? '')
  useEffect(() => {
    setLocalTime(item.orario_preciso?.slice(0, 5) ?? '')
  }, [item.orario_preciso])

  // Debounce ref for time input — cleaned up on unmount
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null
      setLocalTime(value ?? '')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setExactTime.mutate({ id: item.id, tripId, orario_preciso: value })
      }, 500)
    },
    [item.id, tripId, setExactTime]
  )

  return (
    <div
      className={[
        'group flex items-center gap-2 px-2 py-1.5 rounded-lg border select-none transition-all',
        isDragging
          ? 'opacity-40 border-white/20 bg-white/[0.06]'
          : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]',
      ].join(' ')}
    >
      {/* Drag handle area */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="flex-1 flex items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing touch-none"
      >
        <span className="text-xs text-white/80 truncate">
          {place?.nome ?? '(luogo rimosso)'}
        </span>
        {item.orario_preciso && (
          <span className="text-[10px] text-white/40 shrink-0 flex items-center gap-0.5">
            <Clock size={9} />
            {item.orario_preciso.slice(0, 5)}
          </span>
        )}
      </div>

      {/* Time input (visible on hover) */}
      <input
        type="time"
        value={localTime}
        onChange={handleTimeChange}
        onClick={(e) => e.stopPropagation()}
        className="hidden group-hover:block w-[76px] text-[10px] bg-white/[0.06] border border-white/[0.10] rounded-md px-1.5 py-0.5 text-white/60 focus:outline-none focus:border-blue-500/40"
        title="Orario preciso"
      />

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          removeItem.mutate({ id: item.id, tripId })
        }}
        disabled={removeItem.isPending}
        className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
        title="Rimuovi dall'itinerario"
      >
        <X size={11} />
      </button>
    </div>
  )
}

interface AccommodationPillProps {
  event: AccommodationEvent
}

function AccommodationPill({ event }: AccommodationPillProps) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] opacity-70">
      <Hotel size={11} className="text-blue-400 shrink-0" />
      <span className="text-[11px] text-blue-300/80 truncate">
        {event.eventType === 'checkin' ? 'Check-in' : 'Check-out'}: {event.accommodation.nome}
      </span>
    </div>
  )
}

interface SlotZoneProps {
  slot: TimeSlot
  dayDate: string
  items: TripItineraryItem[]
  accommodationEvents: AccommodationEvent[]
  places: TripPlace[]
  tripId: string
}

function SlotZone({ slot, dayDate, items, accommodationEvents, places, tripId }: SlotZoneProps) {
  const droppableId = `${dayDate}:${slot}`
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })

  const slotItems = items.filter((i) => i.time_slot === slot)
  const slotAccEvents = accommodationEvents.filter((e) => e.timeSlot === slot)
  const hasContent = slotItems.length > 0 || slotAccEvents.length > 0

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`text-[11px] font-medium uppercase tracking-wide ${SLOT_COLOR[slot]}`}>
          {SLOT_LABEL[slot]}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'min-h-[48px] rounded-lg border p-1.5 flex flex-col gap-1 transition-colors',
          isOver
            ? 'border-blue-500/40 bg-blue-500/[0.06]'
            : hasContent
            ? 'border-white/[0.06] bg-white/[0.02]'
            : 'border-dashed border-white/[0.06] bg-transparent',
        ].join(' ')}
      >
        {slotAccEvents.map((event) => (
          <AccommodationPill key={event.id} event={event} />
        ))}
        {slotItems.map((item) => (
          <DraggableSlotItem
            key={item.id}
            item={item}
            place={places.find((p) => p.id === item.place_id) ?? undefined}
            tripId={tripId}
          />
        ))}
        {!hasContent && !isOver && (
          <p className="text-[10px] text-white/15 text-center py-1 select-none">
            Trascina qui
          </p>
        )}
      </div>
    </div>
  )
}

interface Props {
  dayDate: string
  items: TripItineraryItem[]
  accommodationEvents: AccommodationEvent[]
  places: TripPlace[]
  tripId: string
}

export function ItineraryDayColumn({ dayDate, items, accommodationEvents, places, tripId }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {TIME_SLOTS.map((slot) => (
        <SlotZone
          key={slot}
          slot={slot}
          dayDate={dayDate}
          items={items}
          accommodationEvents={accommodationEvents}
          places={places}
          tripId={tripId}
        />
      ))}
    </div>
  )
}
