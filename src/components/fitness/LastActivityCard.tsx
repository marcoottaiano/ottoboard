'use client'

import { useActivities } from '@/hooks/useActivities'
import { ExternalLink, Heart, Timer, TrendingUp } from 'lucide-react'
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

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse h-full">
      <div className="flex gap-4 h-full">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-white/10 rounded w-24" />
          <div className="h-6 bg-white/10 rounded w-48" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-white/10 rounded" />
            ))}
          </div>
        </div>
        <div className="hidden md:block w-44 bg-white/10 rounded-lg" />
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
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]">
        Nessuna attività trovata
      </div>
    )
  }

  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(1) : null

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex gap-3">
        {/* Contenuto principale */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActivityBadge type={activity.type} />
              <span className="text-xs text-gray-500 truncate">{formatDate(activity.start_date)}</span>
            </div>
            <h3 className="text-lg font-semibold text-white truncate mb-2">{activity.name}</h3>

            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
              <Stat
                label="Durata"
                value={formatDuration(activity.moving_time)}
                icon={<Timer size={11} />}
              />
              {distanceKm && (
                <Stat label="Distanza" value={`${distanceKm} km`} />
              )}
              {(activity.average_heartrate || activity.max_heartrate) && (
                <Stat
                  label="FC media / max"
                  value={`${activity.average_heartrate ? Math.round(activity.average_heartrate) : '—'} / ${activity.max_heartrate ? Math.round(activity.max_heartrate) : '—'}`}
                  icon={<Heart size={11} />}
                />
              )}
              {activity.average_pace && distanceKm && (
                <Stat
                  label="Pace"
                  value={formatPace(activity.average_pace)}
                  icon={<TrendingUp size={11} />}
                />
              )}
            </div>
          </div>

          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Vedi su Strava <ExternalLink size={11} />
          </a>
        </div>

        {/* Mappa polyline */}
        <div className="hidden md:flex flex-shrink-0 items-stretch">
          <PolylineMap polyline={activity.map_polyline} width={160} height={150} className="h-full" />
        </div>
      </div>
    </div>
  )
}
