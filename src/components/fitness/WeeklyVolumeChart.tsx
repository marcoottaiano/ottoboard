'use client'

import { useActivities } from '@/hooks/useActivities'
import { Activity, ActivityType } from '@/types'
import { Select, SelectOption } from '@/components/ui/Select'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const ACTIVITY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'Run', label: 'Corsa' },
  { value: 'WeightTraining', label: 'Palestra' },
  { value: 'Walk', label: 'Camminata' },
  { value: 'Hike', label: 'Escursione' },
  { value: 'Ski', label: 'Sci' },
]

function getWeekLabel(date: Date) {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function buildWeeklyData(activities: Activity[]) {
  const now = new Date()
  const weeks: { label: string; km: number; ore: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const end = new Date(now)
    end.setDate(now.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)

    const weekActivities = activities.filter((a) => {
      const d = new Date(a.start_date)
      return d >= start && d <= end
    })

    weeks.push({
      label: getWeekLabel(start),
      km: weekActivities.reduce((acc, a) => acc + (a.distance ?? 0) / 1000, 0),
      ore: weekActivities.reduce((acc, a) => acc + a.moving_time / 3600, 0),
    })
  }

  return weeks
}

export function WeeklyVolumeChart() {
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')

  const twelveWeeksAgoStr = new Date(Date.now() - 84 * 86400000).toISOString().slice(0, 10)

  const { data: activities, isLoading } = useActivities({
    type: typeFilter === 'all' ? undefined : typeFilter,
    after: twelveWeeksAgoStr,
  })

  const chartData = activities ? buildWeeklyData(activities) : []

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Volume settimanale</h3>
        <Select
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ActivityType | 'all')}
          options={ACTIVITY_TYPE_OPTIONS}
          showPlaceholder={false}
          className="w-32"
        />
      </div>

      {isLoading ? (
        <div className="h-48 bg-white/5 rounded animate-pulse" />
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Bar dataKey="km" name="km" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="ore" name="ore" fill="#fb923c80" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
