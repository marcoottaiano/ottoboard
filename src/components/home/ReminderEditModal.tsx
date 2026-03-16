'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useUpdateReminder, useDeleteReminder } from '@/hooks/useReminders'
import type { Reminder, ReminderPriority, ReminderRecurrence } from '@/types'

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
  reminder: Reminder
  onClose: () => void
}

export function ReminderEditModal({ reminder, onClose }: Props) {
  const updateReminder = useUpdateReminder()
  const deleteReminder = useDeleteReminder()
  const [title, setTitle] = useState(reminder.title)
  const [dueDate, setDueDate] = useState(reminder.due_date)
  const [dueTime, setDueTime] = useState(reminder.due_time ?? '')
  const [priority, setPriority] = useState<ReminderPriority>(reminder.priority)
  const [recurrence, setRecurrence] = useState<'' | ReminderRecurrence>(reminder.recurrence ?? '')
  const [notes, setNotes] = useState(reminder.notes ?? '')
  const [confirming, setConfirming] = useState(false)

  const canSubmit = title.trim() && dueDate

  const handleSubmit = () => {
    if (!canSubmit) return
    updateReminder.mutate(
      {
        id: reminder.id,
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

  const handleDelete = () => {
    deleteReminder.mutate(reminder.id, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Modifica promemoria</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
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

          {/* Delete */}
          <div className="pt-2 border-t border-white/5">
            {confirming ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Eliminare questo promemoria?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleteReminder.isPending}
                  className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                >
                  Elimina
                </button>
                <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-400">
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} /> Elimina
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || updateReminder.isPending}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updateReminder.isPending ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
