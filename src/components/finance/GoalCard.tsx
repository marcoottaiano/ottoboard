'use client'

import { Pencil, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import { FinancialGoal } from '@/types'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Parsing YYYY-MM-DD come data locale (non UTC) per evitare sfasamento timezone
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  goal: FinancialGoal
  onEdit: () => void
  onUpdate: () => void
}

export function GoalCard({ goal, onEdit, onUpdate }: Props) {
  const pct = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0
  const remaining = goal.target_amount - goal.current_amount
  const barColor = goal.color ?? '#22c55e'
  const days = goal.deadline ? daysUntil(goal.deadline) : null

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 transition-all ${
      goal.completed
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-white/5 border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {goal.icon && <span className="text-xl flex-shrink-0">{goal.icon}</span>}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{goal.name}</h3>
            {goal.completed && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-0.5">
                <CheckCircle2 size={11} /> Completato
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!goal.completed && (
            <button
              onClick={onUpdate}
              title="Aggiorna importo"
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <button
            onClick={onEdit}
            title="Modifica obiettivo"
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5 text-xs">
          <span className="text-white font-medium">{formatEur(goal.current_amount)}</span>
          <span className="text-gray-500">di {formatEur(goal.target_amount)}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="font-medium" style={{ color: barColor }}>
            {pct.toFixed(0)}%
          </span>
          {!goal.completed && remaining > 0 && (
            <span className="text-gray-600">mancano {formatEur(remaining)}</span>
          )}
        </div>
      </div>

      {/* Deadline */}
      {goal.deadline && days !== null && !goal.completed && (
        <div className={`flex items-center gap-1.5 text-xs ${
          days < 0 ? 'text-red-400' : days <= 7 ? 'text-yellow-400' : 'text-gray-500'
        }`}>
          <Clock size={11} />
          {days < 0
            ? `Scaduto ${Math.abs(days)} giorni fa`
            : days === 0
            ? 'Scade oggi'
            : `${days} giorni alla scadenza`}
        </div>
      )}
    </div>
  )
}
