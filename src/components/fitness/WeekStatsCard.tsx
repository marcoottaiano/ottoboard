'use client'

import { useWeekStats } from '@/hooks/useWeekStats'
import { Route, Timer, Dumbbell } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  Run: 'Corsa',
  WeightTraining: 'Gym',
  Walk: 'Walk',
  Hike: 'Hike',
  Ski: 'Sci',
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-500 text-xs">→ 0%</span>
  const isPositive = value > 0
  return (
    <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse h-full">
      <div className="h-4 bg-white/10 rounded w-32 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/10 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function WeekStatsCard() {
  const { current, delta, isLoading } = useWeekStats()

  if (isLoading) return <SkeletonCard />

  if (!current) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]">
        Nessuna attività questa settimana
      </div>
    )
  }

  const typeEntries = Object.entries(current.typeCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Questa settimana</h3>
      <div className="grid grid-cols-3 gap-3 flex-1">

        {/* Allenamenti con breakdown tipi */}
        <div className="col-span-1 flex flex-col gap-1 p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Dumbbell size={12} />
            Allenamenti
          </div>
          <span className="text-2xl font-bold text-white">{current.count}</span>
          <Delta value={delta?.count ?? 0} />
          {typeEntries.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              {typeEntries.map(([type, n]) => (
                <span key={type} className="text-[10px] text-gray-500">
                  {n}× {TYPE_LABELS[type] ?? type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Distanza */}
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Route size={12} />
            Distanza
          </div>
          <span className="text-2xl font-bold text-white">{current.distanceKm.toFixed(1)}</span>
          <span className="text-xs text-gray-500">km</span>
          <Delta value={delta?.distanceKm ?? 0} />
        </div>

        {/* Ore */}
        <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Timer size={12} />
            Ore totali
          </div>
          <span className="text-2xl font-bold text-white">{current.durationHours.toFixed(1)}</span>
          <span className="text-xs text-gray-500">h</span>
          <Delta value={delta?.durationHours ?? 0} />
        </div>
      </div>
    </div>
  )
}
