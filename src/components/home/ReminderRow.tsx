'use client'

import type { Reminder } from '@/types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
}

function formatDueDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function isOverdue(dateStr: string): boolean {
  const parts = dateStr.split('-').map(Number)
  const due = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

interface Props {
  reminder: Reminder
  onComplete: (id: string) => void
  onEdit: (r: Reminder) => void
}

export function ReminderRow({ reminder, onComplete, onEdit }: Props) {
  const overdue = isOverdue(reminder.due_date)

  return (
    <div className="flex items-start gap-2.5 py-2 group">
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(reminder.id) }}
        className="mt-0.5 w-4 h-4 rounded border border-white/20 flex-shrink-0 hover:border-purple-400 hover:bg-purple-500/20 transition-colors"
        aria-label="Completa"
      />
      <button
        onClick={() => onEdit(reminder)}
        className="flex-1 flex items-start justify-between gap-2 text-left"
      >
        <span className={`text-sm leading-snug ${overdue ? 'text-red-400' : 'text-white/80'}`}>
          {reminder.title}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {reminder.priority !== 'none' && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[reminder.priority] ?? ''}`}>
              {PRIORITY_LABELS[reminder.priority]}
            </span>
          )}
          <span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-600'}`}>
            {formatDueDate(reminder.due_date)}
          </span>
        </div>
      </button>
    </div>
  )
}
