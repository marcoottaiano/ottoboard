'use client'

import { Flame, Settings } from 'lucide-react'
import type { HabitWithStats } from '@/types/habits'

interface HabitRowProps {
  habit: HabitWithStats
  onToggle: (habitId: string, date: string) => void
  onEdit: (habit: HabitWithStats) => void
  todayStr: string
  isToggling?: boolean
}

export function HabitRow({ habit, onToggle, onEdit, todayStr, isToggling = false }: HabitRowProps) {
  const accentColor = habit.color ?? '#2dd4bf'

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      {/* Checkbox */}
      <button
        onClick={() => onToggle(habit.id, todayStr)}
        disabled={isToggling}
        className="flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: accentColor,
          backgroundColor: habit.completedToday ? accentColor : 'transparent',
        }}
        aria-label={habit.completedToday ? 'Segna come non completata' : 'Segna come completata'}
      >
        {habit.completedToday && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Icon + Name */}
      <button
        type="button"
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        onClick={() => onEdit(habit)}
        aria-label={`Modifica abitudine ${habit.name}`}
      >
        {habit.icon && (
          <span className="text-base leading-none flex-shrink-0">{habit.icon}</span>
        )}
        <span
          className={`text-sm font-medium truncate transition-colors ${
            habit.completedToday ? 'text-white/40 line-through' : 'text-white/80'
          }`}
        >
          {habit.name}
        </span>
      </button>

      {/* Streak badge */}
      {habit.streak > 0 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Flame size={12} style={{ color: accentColor }} />
          <span className="text-xs font-medium" style={{ color: accentColor }}>
            {habit.streak}
          </span>
        </div>
      )}

      {/* Edit button (hover only) */}
      <button
        onClick={() => onEdit(habit)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-400"
        aria-label="Modifica abitudine"
      >
        <Settings size={13} />
      </button>
    </div>
  )
}
