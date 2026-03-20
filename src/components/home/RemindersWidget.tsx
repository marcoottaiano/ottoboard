'use client'

import { useState } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { usePendingReminders, useCompleteReminder, useCompletedReminders } from '@/hooks/useReminders'
import { ReminderRow } from './ReminderRow'
import { ReminderCreateModal } from './ReminderCreateModal'
import { ReminderEditModal } from './ReminderEditModal'
import { CompletedRemindersModal } from './CompletedRemindersModal'
import type { Reminder } from '@/types'

export function RemindersWidget() {
  const { data: pending = [], isLoading } = usePendingReminders()
  const { data: completed = [] } = useCompletedReminders()
  const completeReminder = useCompleteReminder()

  const [showCreate, setShowCreate] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={15} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Promemoria</h3>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-purple-400 transition-colors"
        >
          <Plus size={13} />
          Aggiungi
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-gray-600">Nessun promemoria in scadenza</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            + Aggiungi promemoria
          </button>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
          {pending.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onComplete={(id) => {
                const reminder = pending.find(p => p.id === id)
                if (reminder) completeReminder.mutate(reminder)
              }}
              onEdit={setEditingReminder}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {completed.length > 0 && (
        <button
          onClick={() => setShowCompleted(true)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors self-start"
        >
          {completed.length} completat{completed.length === 1 ? 'o' : 'i'} →
        </button>
      )}

      {showCreate && <ReminderCreateModal onClose={() => setShowCreate(false)} />}
      {editingReminder && (
        <ReminderEditModal
          reminder={editingReminder}
          onClose={() => setEditingReminder(null)}
        />
      )}
      {showCompleted && <CompletedRemindersModal onClose={() => setShowCompleted(false)} />}
    </div>
  )
}
