'use client'

import { useActivities } from '@/hooks/useActivities'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { ExternalLink, Heart, Timer, TrendingUp, Flame } from 'lucide-react'
import { ActivityBadge } from './ActivityBadge'
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
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

function SkeletonCard({ bare = false }: { bare?: boolean }) {
  const cls = bare
    ? 'p-5 animate-pulse h-full'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse h-full'
  return (
    <div className={cls}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-white/10 rounded w-16" />
          <div className="h-4 bg-white/10 rounded w-32" />
        </div>
        <div className="h-6 bg-white/10 rounded w-48" />
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/10 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function LastActivityCard({ bare = false }: { bare?: boolean }) {
  const { data: activities, isLoading } = useActivities({ limit: 1 })
  const { lastSyncedAt, isConnectionError } = useStravaConnection()

  if (isLoading) return <SkeletonCard bare={bare} />

  const activity = activities?.[0]

  if (!activity) {
    const emptyClass = bare
      ? 'p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]'
      : 'rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]'
    return <div className={emptyClass}>Nessuna attività trovata</div>
  }

  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null

  const outerClass = bare
    ? 'p-5 flex flex-col gap-4 overflow-hidden'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4 overflow-hidden'

  return (
    <div className={outerClass}>
      {/* Header: badge tipo + data + sync status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ActivityBadge type={activity.type} />
          <span className="text-xs text-gray-500">{formatDate(activity.start_date)}</span>
        </div>
        <SyncStatusBadge lastSyncedAt={lastSyncedAt} hasError={isConnectionError} />
      </div>

      {/* Nome attività */}
      <h3 className="text-lg font-semibold text-white truncate -mt-2">{activity.name}</h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
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
            value={`${activity.average_heartrate ? Math.round(activity.average_heartrate) : '—'} / ${activity.max_heartrate ? Math.round(activity.max_heartrate) : '—'} bpm`}
            icon={<Heart size={11} />}
          />
        )}
        {activity.average_pace && distanceKm && (
          <Stat
            label="Pace medio"
            value={formatPace(activity.average_pace)}
            icon={<TrendingUp size={11} />}
          />
        )}
        {activity.calories && (
          <Stat
            label="Calorie"
            value={`${activity.calories} kcal`}
            icon={<Flame size={11} />}
          />
        )}
      </div>

      {/* Link Strava */}
      <a
        href={`https://www.strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors w-fit"
      >
        Vedi su Strava <ExternalLink size={11} />
      </a>
    </div>
  )
}
