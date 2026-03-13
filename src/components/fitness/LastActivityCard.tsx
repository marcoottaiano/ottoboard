'use client'

import { useActivities } from '@/hooks/useActivities'
import { ExternalLink, Flame, Heart, Timer, TrendingUp } from 'lucide-react'
import { ActivityBadge } from './ActivityBadge'
import { PolylineMap } from './PolylineMap'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')} /km`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
      <div className="flex justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-white/10 rounded w-24" />
          <div className="h-6 bg-white/10 rounded w-48" />
          <div className="h-4 bg-white/10 rounded w-32" />
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-white/10 rounded" />
            ))}
          </div>
        </div>
        <div className="hidden md:block w-48 h-32 bg-white/10 rounded-lg ml-4" />
      </div>
    </div>
  )
}

export function LastActivityCard() {
  const { data: activities, isLoading } = useActivities({ limit: 1 })

  if (isLoading) return <SkeletonCard />

  const activity = activities?.[0]

  if (!activity) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 min-h-[140px]">
        Nessuna attività trovata
      </div>
    )
  }

  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(1) : null

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ActivityBadge type={activity.type} />
            <span className="text-xs text-gray-500">{formatDate(activity.start_date)}</span>
          </div>
          <h3 className="text-lg font-semibold text-white truncate mb-3">{activity.name}</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                <Timer size={11} /> Durata
              </span>
              <span className="text-sm font-medium text-white">
                {formatDuration(activity.moving_time)}
              </span>
            </div>

            {distanceKm && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 mb-0.5">Distanza</span>
                <span className="text-sm font-medium text-white">{distanceKm} km</span>
              </div>
            )}

            {(activity.average_heartrate || activity.max_heartrate) && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                  <Heart size={11} /> FC
                </span>
                <span className="text-sm font-medium text-white">
                  {activity.average_heartrate ? `${Math.round(activity.average_heartrate)}` : '—'}
                  <span className="text-gray-500 text-xs">
                    /{activity.max_heartrate ? Math.round(activity.max_heartrate) : '—'} bpm
                  </span>
                </span>
              </div>
            )}

            {activity.average_pace && distanceKm && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                  <TrendingUp size={11} /> Pace
                </span>
                <span className="text-sm font-medium text-white">
                  {formatPace(activity.average_pace)}
                </span>
              </div>
            )}

            {activity.calories && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-0.5">
                  <Flame size={11} /> Calorie
                </span>
                <span className="text-sm font-medium text-white">{activity.calories} kcal</span>
              </div>
            )}
          </div>

          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Vedi su Strava <ExternalLink size={11} />
          </a>
        </div>

        <div className="hidden md:block flex-shrink-0">
          <PolylineMap polyline={activity.map_polyline} width={180} height={110} />
        </div>
      </div>
    </div>
  )
}
