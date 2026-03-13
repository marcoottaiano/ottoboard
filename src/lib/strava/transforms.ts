import { Activity } from '@/types'
import { StravaActivity } from './types'

function calcAveragePace(movingTime: number, distanceM: number): number | null {
  if (!distanceM || distanceM === 0) return null
  const distanceKm = distanceM / 1000
  return movingTime / distanceKm // secondi per km
}

export function stravaActivityToDb(
  raw: StravaActivity,
  userId: string
): Omit<Activity, 'created_at'> {
  return {
    id: raw.id,
    user_id: userId,
    type: raw.type as Activity['type'],
    name: raw.name,
    start_date: raw.start_date,
    distance: raw.distance || null,
    moving_time: raw.moving_time,
    elapsed_time: raw.elapsed_time,
    average_heartrate: raw.average_heartrate ?? null,
    max_heartrate: raw.max_heartrate ?? null,
    average_pace: calcAveragePace(raw.moving_time, raw.distance),
    calories: raw.calories ?? null,
    kudos_count: raw.kudos_count ?? null,
    map_polyline: raw.map?.summary_polyline ?? null,
    raw_data: raw as unknown as Record<string, unknown>,
  }
}
