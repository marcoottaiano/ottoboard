'use client'

import { useWeekStats } from '@/hooks/useWeekStats'
import { Dumbbell, Flame, Route, Timer } from 'lucide-react'

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-500 text-xs">→ 0%</span>
  const isPositive = value > 0
  return (
    <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

function StatItem({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode
  label: string
  value: string
  delta: number
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        {icon}
        {label}
      </div>
      <span className="text-xl font-bold text-white">{value}</span>
      <Delta value={delta} />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-32 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
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
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 min-h-[140px]">
        Nessuna attività questa settimana
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Questa settimana</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatItem
          icon={<Dumbbell size={12} />}
          label="Allenamenti"
          value={String(current.count)}
          delta={delta?.count ?? 0}
        />
        <StatItem
          icon={<Route size={12} />}
          label="Distanza"
          value={`${current.distanceKm.toFixed(1)} km`}
          delta={delta?.distanceKm ?? 0}
        />
        <StatItem
          icon={<Timer size={12} />}
          label="Ore totali"
          value={`${current.durationHours.toFixed(1)} h`}
          delta={delta?.durationHours ?? 0}
        />
        <StatItem
          icon={<Flame size={12} />}
          label="Calorie"
          value={`${current.calories} kcal`}
          delta={delta?.calories ?? 0}
        />
      </div>
    </div>
  )
}
