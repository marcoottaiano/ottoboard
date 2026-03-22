'use client'

import { useState } from 'react'
import { Target, RefreshCw, Pencil, AlertCircle } from 'lucide-react'
import { useFinancialGoals } from '@/hooks/useFinancialGoals'
import { GoalUpdateModal } from '@/components/finance/GoalUpdateModal'
import { GoalEditModal } from '@/components/finance/GoalEditModal'
import { FinancialGoal } from '@/types'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface Props {
  goalId: string
}

export function FinancialGoalWidget({ goalId }: Props) {
  const { data: goals = [], isLoading } = useFinancialGoals()
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)

  const goal: FinancialGoal | undefined = goals.find((g) => g.id === goalId)

  const pct = goal && goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0
  const barColor = goal?.color ?? '#22c55e'

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-white/80">Obiettivo</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
          <div className="h-2 bg-white/5 rounded animate-pulse" />
        </div>
      ) : !goal ? (
        <div className="flex flex-col items-center justify-center gap-2 min-h-[120px] text-center">
          <AlertCircle size={20} className="text-gray-600" />
          <p className="text-xs text-gray-500">Obiettivo non trovato o eliminato</p>
          <p className="text-xs text-gray-600">Riconfigura il widget dall&apos;icona ⚙</p>
        </div>
      ) : (
        <>
          {/* Goal name */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {goal.icon && <span className="text-lg">{goal.icon}</span>}
              <span className="text-sm font-medium text-white truncate">{goal.name}</span>
              {goal.completed && (
                <span className="text-xs text-emerald-400 flex-shrink-0">✓</span>
              )}
            </div>
            {!goal.completed && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setUpdating(true)}
                  title="Aggiorna importo"
                  className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => setEditing(true)}
                  title="Modifica"
                  className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-white font-semibold text-base">{formatEur(goal.current_amount)}</span>
            <span className="text-gray-500">di {formatEur(goal.target_amount)}</span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className="font-semibold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
              {!goal.completed && (
                <span className="text-gray-600">
                  mancano {formatEur(Math.max(goal.target_amount - goal.current_amount, 0))}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {updating && goal && <GoalUpdateModal goal={goal} onClose={() => setUpdating(false)} />}
      {editing && goal && <GoalEditModal goal={goal} onClose={() => setEditing(false)} />}
    </div>
  )
}
