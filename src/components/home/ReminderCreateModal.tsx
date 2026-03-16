'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateReminder } from '@/hooks/useReminders'
import type { ReminderPriority, ReminderRecurrence } from '@/types'

const PRIORITY_OPTIONS: { value: ReminderPriority; label: string }[] = [
  { value: 'none', label: 'Nessuna' },
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

const RECURRENCE_OPTIONS: { value: '' | ReminderRecurrence; label: string }[] = [
  { value: '', label: 'Nessuna' },
  { value: 'daily', label: 'Ogni giorno' },
  { value: 'weekly', label: 'Ogni settimana' },
  { value: 'monthly', label: 'Ogni mese' },
  { value: 'yearly', label: 'Ogni anno' },
]

interface Props {
  onClose: () => void
}

export function ReminderCreateModal({ onClose }: Props) {
  const createReminder = useCreateReminder()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<ReminderPriority>('none')
  const [recurrence, setRecurrence] = useState<'' | ReminderRecurrence>('')
  const [notes, setNotes] = useState('')

  const canSubmit = title.trim() && dueDate

  const handleSubmit = () => {
    if (!canSubmit) return
    createReminder.mutate(
      {
        title: title.trim(),
        due_date: dueDate,
        due_time: dueTime || null,
        priority,
        recurrence: recurrence || null,
        notes: notes.trim() || null,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Nuovo promemoria</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo *"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ReminderPriority)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-white/30"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as '' | ReminderRecurrence)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-white/30"
            >
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note (opzionale)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        <div className="px-4 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || createReminder.isPending}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createReminder.isPending ? 'Salvataggio...' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}
