"use client";

import { DataError } from "@/components/ui/DataError";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/watermelon-ui/button";
import type { ReactNode } from "react";
import { Dumbbell, Wallet } from "lucide-react";
import { useWeeklyReviewSummary, type FitnessSummary, type FinanceSummary } from "@/hooks/useWeeklyReviewSummary";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-wm-muted-foreground">{icon}</span>
      <h3 className="text-xs font-semibold text-wm-muted-foreground uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-wm-muted rounded-lg px-3 py-2">
      <p className="text-xs text-wm-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-wm-foreground mt-0.5">
        <PrivacyValue>{value}</PrivacyValue>
      </p>
    </div>
  );
}

function FitnessSection({ data }: { data: FitnessSummary }) {
  if (data.count === 0) {
    return <p className="text-sm text-wm-muted-foreground">Nessun allenamento nella settimana precedente</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCell label="Sessioni" value={String(data.count)} />
      <StatCell label="Distanza" value={`${data.totalKm.toFixed(1)} km`} />
      <StatCell label="Durata" value={`${data.totalMinutes} min`} />
      <StatCell label="Calorie" value={data.totalCalories > 0 ? `${data.totalCalories} kcal` : "—"} />
    </div>
  );
}

function FinanceSection({ data }: { data: FinanceSummary }) {
  const { isPrivate } = usePrivacyMode();
  if (data.totalIncome === 0 && data.totalExpense === 0) {
    return <p className="text-sm text-wm-muted-foreground">Nessun movimento nella settimana precedente</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-wm-muted-foreground">Entrate</span>
        <span className="text-sm text-wm-success font-medium">
          <PrivacyValue>+€{data.totalIncome.toFixed(2)}</PrivacyValue>
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-wm-muted-foreground">Uscite</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-wm-destructive font-medium">
            <PrivacyValue>-€{data.totalExpense.toFixed(2)}</PrivacyValue>
          </span>
          {!isPrivate && data.expenseDelta !== null && (
            <span className={`text-xs ${data.expenseDelta > 0 ? "text-wm-destructive" : "text-wm-success"}`}>
              {data.expenseDelta > 0 ? "+" : ""}
              {data.expenseDelta}%
            </span>
          )}
        </div>
      </div>
      {data.topCategory && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-wm-muted-foreground">Categoria principale</span>
          <span className="text-sm text-wm-foreground">{data.topCategory}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function WeeklyReviewModal({ onClose }: Props) {
  const { data, isLoading, isError, refetch } = useWeeklyReviewSummary();

  return (
    <AppDialog
      title="Riepilogo settimanale"
      description={data ? `${data.weekStart} — ${data.weekEnd}` : "La tua settimana in Ottoboard."}
      onClose={onClose}
      className="max-w-lg"
    >
      {/* Header */}

      {/* Body */}
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {isError ? (
          <DataError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-wm-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div>
              <SectionHeader icon={<Dumbbell size={13} />} title="Fitness" />
              <FitnessSection
                data={
                  data?.fitness ?? {
                    count: 0,
                    totalKm: 0,
                    totalCalories: 0,
                    totalMinutes: 0,
                  }
                }
              />
            </div>

            <div className="border-t border-wm-border" />

            <div>
              <SectionHeader icon={<Wallet size={13} />} title="Finanze" />
              <FinanceSection
                data={
                  data?.finance ?? {
                    totalIncome: 0,
                    totalExpense: 0,
                    topCategory: null,
                    expenseDelta: null,
                  }
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-wm-border flex justify-end">
        <Button
          variant="ghost"
          size="auto"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-wm-muted border border-wm-border text-wm-muted-foreground text-sm hover:bg-wm-muted transition-colors"
        >
          Chiudi
        </Button>
      </div>
    </AppDialog>
  );
}
