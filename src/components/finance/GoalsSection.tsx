'use client'

import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useFinancialGoals } from '@/hooks/useFinancialGoals'
import { GoalCard } from './GoalCard'
import { GoalCreateModal } from './GoalCreateModal'
import { GoalEditModal } from './GoalEditModal'
import { GoalUpdateModal } from './GoalUpdateModal'
import { FinancialGoal } from '@/types'

export function GoalsSection() {
  const { data: goals = [], isLoading } = useFinancialGoals()
  const [showCreate, setShowCreate] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [updatingGoal, setUpdatingGoal] = useState<FinancialGoal | null>(null)

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-gray-400">Obiettivi di risparmio</h3>
          {goals.length > 0 && (
            <span className="text-xs text-gray-600">
              {activeGoals.length} attivi
              {completedGoals.length > 0 && ` · ${completedGoals.length} completati`}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/8 transition-colors"
        >
          <Plus size={12} /> Nuovo
        </button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <p className="text-gray-600 text-sm">Nessun obiettivo creato</p>
          <p className="text-gray-700 text-xs">
            Imposta un obiettivo di risparmio e monitora il tuo progresso
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Crea il primo obiettivo →
          </button>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onUpdate={() => setUpdatingGoal(goal)}
            />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-600 mb-2">Completati</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setEditingGoal(goal)}
                onUpdate={() => setUpdatingGoal(goal)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <GoalCreateModal onClose={() => setShowCreate(false)} />}
      {editingGoal && <GoalEditModal goal={editingGoal} onClose={() => setEditingGoal(null)} />}
      {updatingGoal && <GoalUpdateModal goal={updatingGoal} onClose={() => setUpdatingGoal(null)} />}
    </div>
  )
}
