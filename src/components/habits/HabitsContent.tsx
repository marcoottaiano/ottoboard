'use client'

import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useHabits, useToggleCompletion } from '@/hooks/useHabits'
import { toLocalDateStr, getIsoWeekday } from '@/lib/dateUtils'
import { HabitRow } from './HabitRow'
import { HabitCreateModal } from './HabitCreateModal'
import { HabitEditModal } from './HabitEditModal'
import { HabitHeatmap } from './HabitHeatmap'
import type { HabitWithStats } from '@/types/habits'

export function HabitsContent() {
  const { data: habits = [], isLoading } = useHabits()
  const toggleCompletion = useToggleCompletion()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitWithStats | null>(null)

  const today = new Date()
  const todayStr = toLocalDateStr(today)
  const todayIso = getIsoWeekday(today)

  // Only show habits scheduled for today
  const todaysHabits = habits.filter((h) => h.target_days.includes(todayIso))
  const completedCount = todaysHabits.filter((h) => h.completedToday).length

  // Sort: uncompleted first, then by name
  const sortedHabits = [...todaysHabits].sort((a, b) => {
    if (a.completedToday !== b.completedToday) return a.completedToday ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white/90">Abitudini</h1>
          <p className="text-sm text-gray-500 mt-0.5">Traccia le tue abitudini quotidiane</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500/15 border border-teal-500/25 text-teal-400 text-sm hover:bg-teal-500/25 transition-colors"
        >
          <Plus size={14} />
          Nuova
        </button>
      </div>

      {/* Heatmap */}
      <HabitHeatmap />

      {/* Today's habits */}
      <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target size={15} className="text-teal-400" />
            <h2 className="text-sm font-semibold text-white/80">Oggi</h2>
          </div>
          {todaysHabits.length > 0 && (
            <span className="text-xs text-gray-500">
              {completedCount}/{todaysHabits.length} completate
            </span>
          )}
        </div>

        <div className="px-4">
          {isLoading ? (
            <div className="py-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : habits.length === 0 ? (
            <div className="py-8 text-center">
              <Target size={28} className="text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nessuna abitudine configurata</p>
              <p className="text-xs text-gray-700 mt-1">Crea la tua prima abitudine per iniziare</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-xs text-teal-500 hover:text-teal-400 transition-colors"
              >
                + Aggiungi abitudine
              </button>
            </div>
          ) : todaysHabits.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-500">Nessuna abitudine programmata per oggi</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sortedHabits.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  onToggle={(id, date) => {
                    if (togglingId === id) return
                    setTogglingId(id)
                    toggleCompletion.mutate(
                      { habitId: id, date },
                      { onSettled: () => setTogglingId(null) }
                    )
                  }}
                  isToggling={togglingId === h.id}
                  onEdit={setEditingHabit}
                  todayStr={todayStr}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All habits list (not just today) */}
      {habits.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white/80">Tutte le abitudini</h2>
          </div>
          <div className="px-4 divide-y divide-white/5">
            {[...habits]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  onToggle={(id, date) => {
                    if (togglingId === id) return
                    setTogglingId(id)
                    toggleCompletion.mutate(
                      { habitId: id, date },
                      { onSettled: () => setTogglingId(null) }
                    )
                  }}
                  isToggling={togglingId === h.id}
                  onEdit={setEditingHabit}
                  todayStr={todayStr}
                />
              ))}
          </div>
        </div>
      )}

      {showCreate && <HabitCreateModal onClose={() => setShowCreate(false)} />}
      {editingHabit && (
        <HabitEditModal habit={editingHabit} onClose={() => setEditingHabit(null)} />
      )}
    </div>
  )
}
