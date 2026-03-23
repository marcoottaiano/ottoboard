'use client'

import { useActivities, ActivityFilters } from '@/hooks/useActivities'
import { Activity, ActivityType } from '@/types'
import { Select, SelectOption } from '@/components/ui/Select'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { ActivityBadge } from './ActivityBadge'
import { ActivityModal } from './ActivityModal'
import { toLocalDateStr } from '@/lib/dateUtils'

const PAGE_SIZE = 20

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'Run', label: 'Corsa' },
  { value: 'WeightTraining', label: 'Palestra' },
  { value: 'Walk', label: 'Camminata' },
  { value: 'Hike', label: 'Escursione' },
  { value: 'Ski', label: 'Sci' },
]

const PERIOD_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Sempre' },
  { value: '30', label: '30 giorni' },
  { value: '90', label: '3 mesi' },
  { value: '180', label: '6 mesi' },
  { value: '365', label: '1 anno' },
]

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
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ActivityList() {
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [periodDays, setPeriodDays] = useState(0)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const after = periodDays > 0
    ? toLocalDateStr(new Date(Date.now() - periodDays * 86400000))
    : undefined

  const filters: ActivityFilters = {
    type: typeFilter === 'all' ? undefined : typeFilter,
    after,
  }

  const { data: activities, isLoading } = useActivities(filters)

  const paginated = activities?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? []
  const totalPages = activities ? Math.ceil(activities.length / PAGE_SIZE) : 0

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex-1">Attività</h3>
        <Select
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v as ActivityType | 'all'); setPage(0) }}
          options={TYPE_OPTIONS}
          showPlaceholder={false}
          className="w-32"
        />
        <Select
          value={String(periodDays)}
          onChange={(v) => { setPeriodDays(Number(v)); setPage(0) }}
          options={PERIOD_OPTIONS}
          showPlaceholder={false}
          className="w-28"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-12 text-center text-gray-600 text-sm">
          Nessuna attività trovata
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600 border-b border-white/5">
                <th className="pb-2 font-normal">Data</th>
                <th className="pb-2 font-normal">Tipo</th>
                <th className="pb-2 font-normal">Nome</th>
                <th className="pb-2 font-normal text-right">Distanza</th>
                <th className="pb-2 font-normal text-right">Durata</th>
                <th className="pb-2 font-normal text-right">FC</th>
                <th className="pb-2 font-normal text-right">Pace</th>
                <th className="pb-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedActivity(a)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 text-gray-500 whitespace-nowrap">
                    {new Date(a.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="py-2.5">
                    <ActivityBadge type={a.type} />
                  </td>
                  <td className="py-2.5 text-white max-w-[200px] truncate">{a.name}</td>
                  <td className="py-2.5 text-gray-300 text-right whitespace-nowrap">
                    {a.distance ? `${(a.distance / 1000).toFixed(1)} km` : '—'}
                  </td>
                  <td className="py-2.5 text-gray-300 text-right whitespace-nowrap">
                    {formatDuration(a.moving_time)}
                  </td>
                  <td className="py-2.5 text-gray-300 text-right whitespace-nowrap">
                    {a.average_heartrate ? `${Math.round(a.average_heartrate)} bpm` : '—'}
                  </td>
                  <td className="py-2.5 text-gray-300 text-right whitespace-nowrap">
                    {a.distance ? formatPace(a.average_pace) : '—'}
                  </td>
                  <td className="py-2.5 text-center">
                    <a
                      href={`https://www.strava.com/activities/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-600 hover:text-orange-400 transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{activities?.length ?? 0} attività totali</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              ←
            </button>
            <span className="px-2 py-1 text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}

      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
      )}
    </div>
  )
}
