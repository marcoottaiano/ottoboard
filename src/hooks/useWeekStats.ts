'use client'

import { Activity } from '@/types'
import { useActivities } from './useActivities'

export interface WeekStats {
  count: number
  distanceKm: number
  durationHours: number
  typeCounts: Record<string, number>
}

export interface WeekStatsDelta {
  count: number
  distanceKm: number
  durationHours: number
}

function getWeekBounds(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - weeksAgo * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function calcStats(activities: Activity[]): WeekStats {
  const typeCounts: Record<string, number> = {}
  let distanceKm = 0
  let durationHours = 0

  for (const a of activities) {
    distanceKm += (a.distance ?? 0) / 1000
    durationHours += a.moving_time / 3600
    typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1
  }

  return { count: activities.length, distanceKm, durationHours, typeCounts }
}

function calcDelta(current: WeekStats, previous: WeekStats): WeekStatsDelta {
  const pct = (c: number, p: number) =>
    p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100)

  return {
    count: pct(current.count, previous.count),
    distanceKm: pct(current.distanceKm, previous.distanceKm),
    durationHours: pct(current.durationHours, previous.durationHours),
  }
}

export function useWeekStats() {
  const currentBounds = getWeekBounds(0)
  const previousBounds = getWeekBounds(1)

  const { data: activities, isLoading } = useActivities({
    after: previousBounds.start.toISOString().slice(0, 10),
  })

  if (!activities) {
    return { current: null, previous: null, delta: null, isLoading }
  }

  const currentActivities = activities.filter((a) => {
    const d = new Date(a.start_date)
    return d >= currentBounds.start && d <= currentBounds.end
  })

  const previousActivities = activities.filter((a) => {
    const d = new Date(a.start_date)
    return d >= previousBounds.start && d <= previousBounds.end
  })

  const current = calcStats(currentActivities)
  const previous = calcStats(previousActivities)
  const delta = calcDelta(current, previous)

  return { current, previous, delta, isLoading }
}
