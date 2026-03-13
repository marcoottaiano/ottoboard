'use client'

import { Activity } from '@/types'
import { ExternalLink, Flame, Heart, Timer, TrendingUp, X } from 'lucide-react'
import { ActivityBadge } from './ActivityBadge'
import { PolylineMap } from './PolylineMap'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')} /km`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

interface ActivityModalProps {
  activity: Activity
  onClose: () => void
}

export function ActivityModal({ activity, onClose }: ActivityModalProps) {
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActivityBadge type={activity.type} />
            </div>
            <h2 className="text-lg font-semibold text-white">{activity.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(activity.start_date).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activity.map_polyline && (
            <PolylineMap polyline={activity.map_polyline} width={440} height={180} className="w-full h-44" />
          )}

          <div>
            <Row label="Durata" value={formatDuration(activity.moving_time)} />
            {distanceKm && <Row label="Distanza" value={`${distanceKm} km`} />}
            {activity.average_pace && distanceKm && <Row label="Pace medio" value={formatPace(activity.average_pace)} />}
            {activity.average_heartrate && (
              <Row label="FC media" value={`${Math.round(activity.average_heartrate)} bpm`} />
            )}
            {activity.max_heartrate && (
              <Row label="FC massima" value={`${Math.round(activity.max_heartrate)} bpm`} />
            )}
            {activity.calories && <Row label="Calorie" value={`${activity.calories} kcal`} />}
            {activity.kudos_count !== null && activity.kudos_count !== undefined && (
              <Row label="Kudos" value={String(activity.kudos_count)} />
            )}
          </div>

          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-sm font-medium transition-colors"
          >
            Apri su Strava <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
