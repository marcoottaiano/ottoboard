"use client";

import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { FinancialGoal } from "@/types";
import { useUpdateFinancialGoal } from "@/hooks/useFinancialGoals";

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

interface Props {
  goal: FinancialGoal;
  onClose: () => void;
}

export function GoalUpdateModal({ goal, onClose }: Props) {
  const [addAmount, setAddAmount] = useState("");
  const update = useUpdateFinancialGoal();
  const saving = useRef(false);

  const delta = Math.max(parseFloat(addAmount) || 0, 0);
  const newAmount = Math.min(goal.current_amount + delta, goal.target_amount);
  const willComplete = newAmount >= goal.target_amount && !goal.completed;

  const handleSave = () => {
    if (saving.current || delta <= 0 || !Number.isFinite(delta)) return;
    saving.current = true;
    // Merge amount update + completion flag into a single atomic write
    const patch: Parameters<typeof update.mutate>[0] = {
      id: goal.id,
      current_amount: newAmount,
      ...(willComplete ? { completed: true } : {}),
    };
    update.mutate(patch, {
      onSettled: () => {
        saving.current = false;
      },
      onSuccess: () => {
        toast.success(willComplete ? "🎉 Obiettivo raggiunto!" : "Importo aggiornato");
        onClose();
      },
      onError: () => toast.error("Errore durante l'aggiornamento"),
    });
  };

  return (
    <AppDialog
      title={goal.name}
      description="Aggiungi un importo al tuo obiettivo di risparmio."
      onClose={onClose}
      busy={update.isPending}
      className="max-w-lg"
    >
      {/* Header */}

      {/* Body */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-wm-muted-foreground">Attuale</span>
          <span className="text-wm-foreground font-medium">
            <PrivacyValue>{formatEur(goal.current_amount)}</PrivacyValue>
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-wm-muted-foreground">Target</span>
          <span className="text-wm-foreground">
            <PrivacyValue>{formatEur(goal.target_amount)}</PrivacyValue>
          </span>
        </div>

        <div>
          <label className="text-xs text-wm-muted-foreground mb-1.5 block">Quanto aggiungi?</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-wm-muted-foreground text-sm">+€</span>
            <Input
              aria-label="Quanto aggiungi?"
              type="number"
              placeholder="0.00"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              min="0"
              step="0.01"
              autoFocus
              className="w-full bg-wm-muted border border-wm-border rounded-lg pl-8 pr-3 py-2 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-none focus:border-wm-border"
            />
          </div>
        </div>

        {delta > 0 && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              willComplete
                ? "bg-wm-success/10 border-wm-success/20 text-wm-success"
                : "bg-wm-muted border-wm-border text-wm-muted-foreground"
            }`}
          >
            <PrivacyValue>
              {willComplete
                ? `🎉 Raggiungerai l'obiettivo! Nuovo totale: ${formatEur(newAmount)}`
                : `Nuovo totale: ${formatEur(newAmount)} (${((newAmount / goal.target_amount) * 100).toFixed(0)}%)`}
            </PrivacyValue>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-wm-border flex justify-end gap-2">
        <Button
          variant="ghost"
          size="auto"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-wm-muted-foreground hover:text-wm-foreground text-sm transition-colors"
        >
          Annulla
        </Button>
        <Button
          variant="default"
          size="auto"
          onClick={handleSave}
          disabled={delta <= 0 || !Number.isFinite(delta) || update.isPending}
          className="px-4 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {update.isPending ? "Salvataggio..." : "Aggiungi"}
        </Button>
      </div>
    </AppDialog>
  );
}
