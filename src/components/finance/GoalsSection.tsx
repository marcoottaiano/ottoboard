"use client";

import { Button } from "@/components/watermelon-ui/button";
import { Card } from "@/components/watermelon-ui/card";

import { DataError } from "@/components/ui/DataError";
import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useFinancialGoals, useReorderFinancialGoals } from "@/hooks/useFinancialGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { computeWaterfall } from "@/lib/finance/waterfall";
import { GoalCard } from "./GoalCard";
import { SortableGoalCard } from "./SortableGoalCard";
import { GoalCreateModal } from "./GoalCreateModal";
import { GoalEditModal } from "./GoalEditModal";
import { FinancialGoal } from "@/types";

export function GoalsSection() {
  const { data: goals = [], isLoading, isError: goalsError, refetch: refetchGoals } = useFinancialGoals();
  const reorderMutation = useReorderFinancialGoals();
  const {
    data: allTransactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useTransactions({});
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const sensors = useSensors(
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalBalance = allTransactions.reduce((sum, transaction) => {
    return sum + (transaction.type === "income" ? transaction.amount : -transaction.amount);
  }, 0);
  const waterfallMap = computeWaterfall(activeGoals, totalBalance);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
    const newIndex = activeGoals.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(activeGoals, oldIndex, newIndex);
    const newOrder = reordered.map((g, i) => ({ id: g.id, position: i }));
    reorderMutation.mutate(newOrder, {
      onError: () => toast.error("Errore durante il riordino. Riprova."),
    });
  }

  if (isLoading || transactionsLoading) {
    return (
      <Card className="wm-card p-5 animate-pulse">
        <div className="h-4 bg-wm-muted rounded w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 bg-wm-muted rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (transactionsError || goalsError)
    return (
      <DataError
        onRetry={() => {
          void refetchGoals();
          void refetchTransactions();
        }}
        message="Impossibile caricare gli obiettivi."
      />
    );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-wm-primary" />
          <h3 className="wm-card-title">Obiettivi di risparmio</h3>
          {goals.length > 0 && (
            <span className="text-xs text-wm-muted-foreground">
              {activeGoals.length} attivi
              {completedGoals.length > 0 && ` · ${completedGoals.length} completati`}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)} className="wm-secondary-action">
          <Plus size={12} /> Nuovo
        </Button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <p className="text-wm-muted-foreground text-sm">Nessun obiettivo creato</p>
          <p className="text-wm-muted-foreground text-xs">
            Imposta un obiettivo di risparmio e monitora il tuo progresso
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(true)} className="wm-action mt-2">
            Crea il primo obiettivo →
          </Button>
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
          <p className="text-xs text-wm-muted-foreground mb-2">Completati</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => setEditingGoal(goal)} />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <GoalCreateModal onClose={() => setShowCreate(false)} />}
      {editingGoal && <GoalEditModal goal={editingGoal} onClose={() => setEditingGoal(null)} />}
    </div>
  );
}
