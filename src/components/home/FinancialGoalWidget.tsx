"use client";

import { DataError } from "@/components/ui/DataError";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { Progress } from "@/components/watermelon-ui/progress";
import { Button } from "@/components/watermelon-ui/button";
import { useState } from "react";
import { Target, RefreshCw, Pencil, AlertCircle } from "lucide-react";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { GoalUpdateModal } from "@/components/finance/GoalUpdateModal";
import { GoalEditModal } from "@/components/finance/GoalEditModal";
import { FinancialGoal } from "@/types";

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

interface Props {
  goalId: string;
}

export function FinancialGoalWidget({ goalId }: Props) {
  const { isPrivate } = usePrivacyMode();
  const { data: goals = [], isLoading, isError, refetch } = useFinancialGoals();
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  const goal: FinancialGoal | undefined = goals.find((g) => g.id === goalId);

  const pct = goal && goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const barColor = goal?.color ?? "#22c55e";

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-wm-success" />
          <h3 className="text-sm font-semibold text-wm-foreground">Obiettivo</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-wm-muted rounded animate-pulse w-3/4" />
          <div className="h-2 bg-wm-muted rounded animate-pulse" />
        </div>
      ) : !goal ? (
        <div className="flex flex-col items-center justify-center gap-2 min-h-[120px] text-center">
          <AlertCircle size={20} className="text-wm-muted-foreground" />
          <p className="text-xs text-wm-muted-foreground">Obiettivo non trovato o eliminato</p>
          <p className="text-xs text-wm-muted-foreground">Riconfigura il widget dall&apos;icona ⚙</p>
        </div>
      ) : (
        <>
          {/* Goal name */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {goal.icon && <span className="text-lg">{goal.icon}</span>}
              <span className="break-words text-sm font-medium text-wm-foreground sm:truncate">{goal.name}</span>
              {goal.completed && <span className="text-xs text-wm-success flex-shrink-0">✓</span>}
            </div>
            {!goal.completed && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  aria-label="Aggiorna importo"
                  variant="ghost"
                  size="auto"
                  onClick={() => setUpdating(true)}
                  title="Aggiorna importo"
                  className="p-1.5 rounded text-wm-muted-foreground hover:text-wm-foreground hover:bg-wm-muted transition-colors"
                >
                  <RefreshCw size={12} />
                </Button>
                <Button
                  aria-label="Modifica"
                  variant="ghost"
                  size="auto"
                  onClick={() => setEditing(true)}
                  title="Modifica"
                  className="p-1.5 rounded text-wm-muted-foreground hover:text-wm-foreground hover:bg-wm-muted transition-colors"
                >
                  <Pencil size={12} />
                </Button>
              </div>
            )}
          </div>

          {/* Amounts */}
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <span className="text-wm-foreground font-semibold text-base">
              <PrivacyValue>{formatEur(goal.current_amount)}</PrivacyValue>
            </span>
            <span className="text-wm-muted-foreground">
              di <PrivacyValue>{formatEur(goal.target_amount)}</PrivacyValue>
            </span>
          </div>

          {/* Progress bar */}
          <div>
            {!isPrivate && (
              <Progress aria-label="Avanzamento obiettivo" value={pct} indicatorStyle={{ backgroundColor: barColor }} />
            )}
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className="font-semibold" style={{ color: barColor }}>
                <PrivacyValue>{pct.toFixed(0)}%</PrivacyValue>
              </span>
              {!goal.completed && (
                <span className="text-wm-muted-foreground">
                  mancano{" "}
                  <PrivacyValue>{formatEur(Math.max(goal.target_amount - goal.current_amount, 0))}</PrivacyValue>
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {updating && goal && <GoalUpdateModal goal={goal} onClose={() => setUpdating(false)} />}
      {editing && goal && <GoalEditModal goal={goal} onClose={() => setEditing(false)} />}
    </div>
  );
}
