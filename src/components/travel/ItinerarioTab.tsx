'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CalendarOff, Map } from 'lucide-react'
import { openGoogleMapsRoute, getItineraryWaypoints } from '@/lib/travel/routeGenerator'
import type { Trip, TripPlace, TimeSlot } from '@/types/travel'
import { useTripPlaces } from '@/hooks/useTripPlaces'
import { useTripAccommodations } from '@/hooks/useTripAccommodations'
import {
  useTripItineraryItems,
  useAddItineraryItem,
  useMoveItineraryItem,
  useRemoveItineraryItem,
} from '@/hooks/useTripItinerary'
import { toLocalDateStr } from '@/lib/dateUtils'
import { ItineraryDayColumn, type AccommodationEvent } from './ItineraryDayColumn'
import { UnassignedPlacesPool } from './UnassignedPlacesPool'

/** Generate array of YYYY-MM-DD strings from data_inizio to data_fine inclusive. */
function generateDays(dataInizio: string, dataFine: string): string[] {
  const days: string[] = []
  // Parse using local constructor to avoid UTC offset issues
  const [sy, sm, sd] = dataInizio.split('-').map(Number)
  const [ey, em, ed] = dataFine.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const cur = new Date(start)
  while (cur <= end) {
    days.push(toLocalDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

/** Format a date string as locale day label, e.g. "Lun 5 Mag" */
function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = date.toLocaleDateString('it-IT', { weekday: 'short' })
  const day = date.getDate()
  const month = date.toLocaleDateString('it-IT', { month: 'short' })
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

interface DragData {
  placeId?: string
  itemId?: string
  sourceSlot?: string
  sourceDay?: string
  sourceType: 'pool' | 'slot'
}

interface Props {
  trip: Trip
}

export function ItinerarioTab({ trip }: Props) {
  const { data: places = [] } = useTripPlaces(trip.id)
  const { data: accommodations = [] } = useTripAccommodations(trip.id)
  const { data: itineraryItems = [] } = useTripItineraryItems(trip.id)

  const addItem = useAddItineraryItem()
  const moveItem = useMoveItineraryItem()
  const removeItem = useRemoveItineraryItem()

  // ── Day tab state ──────────────────────────────────────────────────────────
  const days = useMemo(() => {
    if (!trip.data_inizio || !trip.data_fine) return []
    return generateDays(trip.data_inizio, trip.data_fine)
  }, [trip.data_inizio, trip.data_fine])

  const defaultDay = useMemo(() => {
    if (days.length === 0) return ''
    const today = toLocalDateStr(new Date())
    return days.includes(today) ? today : days[0]
  }, [days])

  const [selectedDay, setSelectedDay] = useState(defaultDay)

  // If selectedDay got invalidated (e.g. trip dates changed), reset to valid
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0] ?? ''

  // ── Accommodation events derived client-side ───────────────────────────────
  const accommodationEvents = useMemo((): AccommodationEvent[] => {
    const events: AccommodationEvent[] = []
    for (const acc of accommodations) {
      if (acc.check_in) {
        events.push({
          id: `acc-checkin-${acc.id}`,
          accommodation: acc,
          eventType: 'checkin',
          timeSlot: 'colazione',
        })
      }
      if (acc.check_out) {
        events.push({
          id: `acc-checkout-${acc.id}`,
          accommodation: acc,
          eventType: 'checkout',
          timeSlot: 'mattina',
        })
      }
    }
    return events
  }, [accommodations])

  /** Accommodation events for the selected day */
  const dayAccommodationEvents = useMemo(
    () => accommodationEvents.filter((e) => {
      const date = e.eventType === 'checkin' ? e.accommodation.check_in : e.accommodation.check_out
      return date === activeDay
    }),
    [accommodationEvents, activeDay]
  )

  /** Itinerary items for the selected day */
  const dayItems = useMemo(
    () => itineraryItems.filter((i) => i.day_date === activeDay),
    [itineraryItems, activeDay]
  )

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    // Guard: ignore if a mutation is already in-flight (prevents duplicate drags)
    if (addItem.isPending || moveItem.isPending || removeItem.isPending) return

    const dragData = active.data.current as DragData
    const overId = String(over.id)

    if (dragData.sourceType === 'pool') {
      if (overId === 'pool') return
      if (!dragData.placeId) return
      // pool → slot: "YYYY-MM-DD:timeSlot"
      const colonIdx = overId.indexOf(':')
      if (colonIdx === -1) return
      const dayDate = overId.slice(0, colonIdx)
      const timeSlot = overId.slice(colonIdx + 1) as TimeSlot
      addItem.mutate({
        trip_id: trip.id,
        day_date: dayDate,
        time_slot: timeSlot,
        item_type: 'place',
        place_id: dragData.placeId,
      })
    } else if (dragData.sourceType === 'slot') {
      if (!dragData.itemId) return
      if (overId === 'pool') {
        // slot → pool: remove from itinerary
        removeItem.mutate({ id: dragData.itemId, tripId: trip.id })
      } else {
        // slot → slot: move
        const colonIdx = overId.indexOf(':')
        if (colonIdx === -1) return
        const dayDate = overId.slice(0, colonIdx)
        const timeSlot = overId.slice(colonIdx + 1) as TimeSlot
        // No-op if same slot
        if (dayDate === dragData.sourceDay && timeSlot === dragData.sourceSlot) return
        moveItem.mutate({
          id: dragData.itemId,
          tripId: trip.id,
          updates: { day_date: dayDate, time_slot: timeSlot },
        })
      }
    }
  }

  // ── Route waypoints — must be before any early return (hooks rule) ───────────
  const routeWaypoints = useMemo(
    () => getItineraryWaypoints(itineraryItems, places),
    [itineraryItems, places]
  )
  const hasEnoughWaypoints = routeWaypoints.length >= 2

  // ── Disabled state ─────────────────────────────────────────────────────────
  if (!trip.data_inizio || !trip.data_fine) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <CalendarOff size={28} className="text-white/20" />
        <p className="text-sm text-white/30">
          Imposta le date del viaggio per attivare l&apos;itinerario
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-5">
        {/* Route button — shown only when ≥2 places with coordinates */}
        {hasEnoughWaypoints && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                const opened = openGoogleMapsRoute(itineraryItems, places)
                if (!opened) alert('Il browser ha bloccato l\'apertura del link. Consenti i popup per questo sito.')
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <Map size={13} />
              Genera percorso
            </button>
          </div>
        )}

        {/* Day tab row — overflow-x-auto overflow-y-hidden (CSS spec guard) */}
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit min-w-full md:min-w-0">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200',
                  activeDay === day
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                {formatDayLabel(day)}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout: pool left, day column right */}
        <div className="flex flex-col md:flex-row gap-5">
          {/* Unassigned places pool */}
          <div className="md:w-56 shrink-0">
            <UnassignedPlacesPool places={places as TripPlace[]} />
          </div>

          {/* Day column */}
          <div className="flex-1 min-w-0">
            {activeDay ? (
              <ItineraryDayColumn
                dayDate={activeDay}
                items={dayItems}
                accommodationEvents={dayAccommodationEvents}
                places={places as TripPlace[]}
                tripId={trip.id}
              />
            ) : (
              <p className="text-sm text-white/30">Nessun giorno disponibile.</p>
            )}
          </div>
        </div>
      </div>
    </DndContext>
  )
}
