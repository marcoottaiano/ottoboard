"use client";

import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { Progress } from "@/components/watermelon-ui/progress";
import { Button } from "@/components/watermelon-ui/button";
import { Card } from "@/components/watermelon-ui/card";

import { Pencil, CheckCircle2, Clock } from "lucide-react";
import { FinancialGoal } from "@/types";

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parsing YYYY-MM-DD come data locale (non UTC) per evitare sfasamento timezone
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  goal: FinancialGoal;
  allocatedAmount?: number;
  onEdit: () => void;
}

export function GoalCard({ goal, allocatedAmount, onEdit }: Props) {
  const displayAmount = allocatedAmount ?? goal.current_amount;
  const pct = goal.target_amount > 0 ? Math.min((displayAmount / goal.target_amount) * 100, 100) : 0;
  const remaining = goal.target_amount - displayAmount;
  const barColor = goal.color ?? "#22c55e";
  const days = goal.deadline ? daysUntil(goal.deadline) : null;
  const state =
    !goal.completed && allocatedAmount !== undefined
      ? allocatedAmount >= goal.target_amount
        ? { label: "Raggiunto", classes: "text-wm-primary bg-wm-success/10" }
        : allocatedAmount > 0
          ? { label: "In corso", classes: "text-wm-warning bg-wm-warning/10" }
          : { label: "Non avviato", classes: "text-wm-muted-foreground bg-wm-muted" }
      : null;

  return (
    <Card className={`wm-card flex flex-col gap-3 p-5 transition-all ${goal.completed ? "border-wm-success/20" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {goal.icon && <span className="text-xl flex-shrink-0">{goal.icon}</span>}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-wm-foreground truncate">{goal.name}</h3>
            {goal.completed && (
              <span className="inline-flex items-center gap-1 text-xs text-wm-primary mt-0.5">
                <CheckCircle2 size={11} /> Completato
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            aria-label="Modifica obiettivo"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Modifica obiettivo"
            className="wm-icon-button size-8"
          >
            <Pencil size={13} />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5 text-xs">
          <span className="text-wm-foreground font-medium">
            <PrivacyValue>{formatEur(displayAmount)}</PrivacyValue>
          </span>
          <span className="text-wm-muted-foreground">
            di <PrivacyValue>{formatEur(goal.target_amount)}</PrivacyValue>
          </span>
        </div>
        <Progress indicatorStyle={{ backgroundColor: barColor }} value={pct} aria-label={`Avanzamento ${goal.name}`} />
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="font-medium" style={{ color: barColor }}>
            {pct.toFixed(0)}%
          </span>
          {!goal.completed && remaining > 0 && (
            <span className="text-wm-muted-foreground">
              mancano <PrivacyValue>{formatEur(remaining)}</PrivacyValue>
            </span>
          )}
        </div>

        {state && (
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${state.classes}`}>
            {state.label}
          </span>
        )}
      </div>

      {/* Deadline */}
      {goal.deadline && days !== null && !goal.completed && (
        <div
          className={`flex items-center gap-1.5 text-xs ${days < 0 ? "text-wm-destructive" : days <= 7 ? "text-wm-warning" : "text-wm-muted-foreground"}`}
        >
          <Clock size={11} />
          {days < 0
            ? `Scaduto ${Math.abs(days)} giorni fa`
            : days === 0
              ? "Scade oggi"
              : `${days} giorni alla scadenza`}
        </div>
      )}
    </Card>
  );
}
