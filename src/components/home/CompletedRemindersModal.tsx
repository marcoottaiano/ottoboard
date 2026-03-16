'use client'

import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { useCompletedReminders, useReopenReminder } from '@/hooks/useReminders'

const PAGE_SIZE = 20

function formatLocalDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset bug (DATE columns = YYYY-MM-DD)
  const parts = dateStr.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  // completed_at is a TIMESTAMPTZ — UTC-to-local conversion is correct here
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  onClose: () => void
}

export function CompletedRemindersModal({ onClose }: Props) {
  const { data: reminders = [], isLoading } = useCompletedReminders()
  const reopenReminder = useReopenReminder()
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(reminders.length / PAGE_SIZE)
  const visible = reminders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">Promemoria completati</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-600">Caricamento...</div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-600">Nessun promemoria completato</div>
          ) : (
            <div className="divide-y divide-white/5">
              {visible.map((r) => (
                <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60 line-through line-clamp-1">{r.title}</p>
                    <div className="flex gap-2 mt-0.5 text-xs text-gray-600">
                      <span>Scadenza: {formatLocalDate(r.due_date)}</span>
                      {r.completed_at && <span>· Completato: {formatDate(r.completed_at)}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => reopenReminder.mutate(r.id)}
                    className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-600 hover:text-purple-400 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Riapri
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 flex-shrink-0">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30"
            >
              ← Precedente
            </button>
            <span className="text-xs text-gray-600">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30"
            >
              Successiva →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
