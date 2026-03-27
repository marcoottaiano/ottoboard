import type { TripItineraryItem, TripPlace } from '@/types/travel'
import { TIME_SLOTS_ORDER } from './constants'

const MAX_WAYPOINTS = 10

interface Waypoint {
  lat: number
  lon: number
  nome: string
}

/**
 * Extract ordered waypoints from itinerary items with coordinates.
 * Sorted by day_date ASC, then by TIME_SLOTS_ORDER index ASC.
 * Only items with item_type = 'place' and non-null lat/lon are included.
 */
export function getItineraryWaypoints(
  itineraryItems: TripItineraryItem[],
  places: TripPlace[],
): Waypoint[] {
  const placeMap = new Map(places.map((p) => [p.id, p]))

  const seenPlaceIds = new Set<string>()

  const filtered = itineraryItems
    .filter((item) => {
      if (item.item_type !== 'place' || !item.place_id) return false
      const place = placeMap.get(item.place_id)
      return place != null && place.lat != null && place.lon != null
    })
    .sort((a, b) => {
      const dayDiff = a.day_date.localeCompare(b.day_date)
      if (dayDiff !== 0) return dayDiff
      const slotA = TIME_SLOTS_ORDER.indexOf(a.time_slot)
      const slotB = TIME_SLOTS_ORDER.indexOf(b.time_slot)
      return slotA - slotB
    })

  const waypoints: Waypoint[] = []
  for (const item of filtered) {
    if (seenPlaceIds.has(item.place_id!)) continue
    seenPlaceIds.add(item.place_id!)
    const place = placeMap.get(item.place_id!)!
    waypoints.push({ lat: place.lat!, lon: place.lon!, nome: place.nome })
    if (waypoints.length >= MAX_WAYPOINTS) break
  }

  return waypoints
}

/**
 * Build a Google Maps Directions URL from waypoints.
 * Requires at least 2 waypoints.
 * No API key required — URL-only construction.
 */
export function buildGoogleMapsRouteUrl(waypoints: Waypoint[]): string {
  const waypointStr = waypoints.map((w) => `${w.lat},${w.lon}`).join('/')
  return `https://www.google.com/maps/dir/${waypointStr}`
}

/**
 * Open a Google Maps route in a new tab for the given itinerary items.
 * Returns false if fewer than 2 waypoints are available.
 */
export function openGoogleMapsRoute(
  itineraryItems: TripItineraryItem[],
  places: TripPlace[],
): boolean {
  const waypoints = getItineraryWaypoints(itineraryItems, places)
  if (waypoints.length < 2) return false
  const url = buildGoogleMapsRouteUrl(waypoints)
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return win !== null
}
