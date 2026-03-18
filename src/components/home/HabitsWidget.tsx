'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Target } from 'lucide-react'
import { useHabits, useToggleCompletion } from '@/hooks/useHabits'
import { toLocalDateStr, getIsoWeekday } from '@/lib/dateUtils'

export function HabitsWidget() {
  const { data: habits = [], isLoading } = useHabits()
  const toggleCompletion = useToggleCompletion()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const todayIso = getIsoWeekday(today)

  const todaysHabits = habits.filter((h) => h.target_days.includes(todayIso))
  const completedCount = todaysHabits.filter((h) => h.completedToday).length

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-teal-400" />
          <h3 className="text-sm font-semibold text-white/80">Abitudini</h3>
        </div>
        {todaysHabits.length > 0 && (
          <span className="text-xs text-gray-500">
            {completedCount}/{todaysHabits.length}
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-2">
          <p className="text-xs text-gray-600">Nessuna abitudine configurata</p>
          <Link href="/habits" className="text-xs text-teal-500 hover:text-teal-400 transition-colors mt-1 inline-block">
            Aggiungi abitudine →
          </Link>
        </div>
      ) : todaysHabits.length === 0 ? (
        <p className="text-xs text-gray-600">Nessuna abitudine per oggi</p>
      ) : (
        <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
          {[...todaysHabits]
            .sort((a, b) => (a.completedToday ? 1 : 0) - (b.completedToday ? 1 : 0))
            .map((h) => {
              const accent = h.color ?? '#2dd4bf'
              return (
                <div key={h.id} className="flex items-center gap-3 py-2">
                  <button
                    onClick={() => {
                      if (togglingId === h.id) return
                      setTogglingId(h.id)
                      toggleCompletion.mutate(
                        { habitId: h.id, date: todayStr },
                        { onSettled: () => setTogglingId(null) }
                      )
                    }}
                    disabled={togglingId === h.id}
                    aria-label={h.completedToday ? 'Segna come non completata' : 'Segna come completata'}
                    className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: accent,
                      backgroundColor: h.completedToday ? accent : 'transparent',
                    }}
                  >
                    {h.completedToday && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {h.icon && <span className="text-xs leading-none flex-shrink-0">{h.icon}</span>}
                  <span
                    className={`text-xs truncate flex-1 ${
                      h.completedToday ? 'text-white/30 line-through' : 'text-white/70'
                    }`}
                  >
                    {h.name}
                  </span>
                  {h.streak > 0 && (
                    <span className="text-[10px]" style={{ color: accent }}>
                      🔥{h.streak}
                    </span>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
