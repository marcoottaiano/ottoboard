'use client'

import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useFinancialGoals, useReorderFinancialGoals } from '@/hooks/useFinancialGoals'
import { useTransactions } from '@/hooks/useTransactions'
import { computeWaterfall } from '@/lib/finance/waterfall'
import { GoalCard } from './GoalCard'
import { SortableGoalCard } from './SortableGoalCard'
import { GoalCreateModal } from './GoalCreateModal'
import { GoalEditModal } from './GoalEditModal'
import { FinancialGoal } from '@/types'

export function GoalsSection() {
  const { data: goals = [], isLoading } = useFinancialGoals()
  const reorderMutation = useReorderFinancialGoals()
  const {
    data: allTransactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useTransactions({})
  const [showCreate, setShowCreate] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)
  const totalBalance = allTransactions.reduce((sum, transaction) => {
    return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)
  const waterfallMap = computeWaterfall(activeGoals, totalBalance)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activeGoals.findIndex((g) => g.id === active.id)
    const newIndex = activeGoals.findIndex((g) => g.id === over.id)
    const reordered = arrayMove(activeGoals, oldIndex, newIndex)
    const newOrder = reordered.map((g, i) => ({ id: g.id, position: i }))
    reorderMutation.mutate(newOrder, {
      onError: () => toast.error('Errore durante il riordino. Riprova.'),
    })
  }

  if (isLoading || transactionsLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (transactionsError) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Target size={15} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-gray-400">Obiettivi di risparmio</h3>
        </div>
        <p className="text-sm text-gray-500">
          Impossibile calcolare l&apos;allocazione in questo momento. Riprova tra poco.
        </p>
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={activeGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeGoals.map((goal) => (
                <SortableGoalCard
                  key={goal.id}
                  goal={goal}
                  allocatedAmount={waterfallMap.get(goal.id) ?? 0}
                  onEdit={() => setEditingGoal(goal)}
                  isDraggable={activeGoals.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <GoalCreateModal onClose={() => setShowCreate(false)} />}
      {editingGoal && <GoalEditModal goal={editingGoal} onClose={() => setEditingGoal(null)} />}
    </div>
  )
}
