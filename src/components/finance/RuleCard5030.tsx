"use client";

import { Card } from "@/components/watermelon-ui/card";

import { DataError } from "@/components/ui/DataError";
import { Progress } from "@/components/watermelon-ui/progress";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { useTransactions } from "@/hooks/useTransactions";

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

interface Props {
  month: string;
}

interface RuleRow {
  key: string;
  label: string;
  description: string;
  target: number;
  actual: number;
  color: string;
  targetPct: number;
}

export function RuleCard5030({ month }: Props) {
  const { data: transactions, isLoading, isError, refetch } = useTransactions({ month });

  if (isError) return <DataError onRetry={() => void refetch()} />;
  if (isLoading) {
    return (
      <Card className="wm-card p-5 animate-pulse">
        <div className="h-4 bg-wm-muted rounded w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-wm-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  const totalIncome = (transactions ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

  const needsTotal = (transactions ?? [])
    .filter((t) => t.type === "expense" && t.category?.spending_type === "needs")
    .reduce((s, t) => s + t.amount, 0);

  const wantsTotal = (transactions ?? [])
    .filter((t) => t.type === "expense" && t.category?.spending_type === "wants")
    .reduce((s, t) => s + t.amount, 0);

  const savingsActual = Math.max(0, totalIncome - needsTotal - wantsTotal);

  const uncategorized = (transactions ?? [])
    .filter((t) => t.type === "expense" && !t.category?.spending_type)
    .reduce((s, t) => s + t.amount, 0);

  if (totalIncome === 0) {
    return (
      <Card className="wm-card p-5">
        <h3 className="wm-card-title mb-1">Regola 50/30/20</h3>
        <p className="text-xs text-wm-muted-foreground mb-4">
          Gestisci le spese: <strong className="text-wm-muted-foreground">50%</strong> necessarie ·{" "}
          <strong className="text-wm-muted-foreground">30%</strong> accessorie ·{" "}
          <strong className="text-wm-muted-foreground">20%</strong> risparmio
        </p>
        <div className="flex items-center justify-center h-20 text-wm-muted-foreground text-sm">
          Aggiungi entrate per vedere l&apos;analisi
        </div>
      </Card>
    );
  }

  const rows: RuleRow[] = [
    {
      key: "needs",
      label: "Necessarie",
      description: "Affitto, cibo, trasporti, salute",
      target: totalIncome * 0.5,
      actual: needsTotal,
      color: "bg-wm-chart-teal",
      targetPct: 50,
    },
    {
      key: "wants",
      label: "Accessorie",
      description: "Svago, abbonamenti, shopping",
      target: totalIncome * 0.3,
      actual: wantsTotal,
      color: "bg-wm-warning",
      targetPct: 30,
    },
    {
      key: "savings",
      label: "Risparmio",
      description: "Entrate − necessarie − accessorie",
      target: totalIncome * 0.2,
      actual: savingsActual,
      color: "bg-wm-success",
      targetPct: 20,
    },
  ];

  return (
    <Card className="wm-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="wm-card-title">Regola 50/30/20</h3>
        <span className="text-xs text-wm-muted-foreground">
          Entrate: <PrivacyValue>{formatEur(totalIncome)}</PrivacyValue>
        </span>
      </div>
      <p className="text-xs text-wm-muted-foreground mb-4">
        Distribuisci le entrate: <span className="text-wm-info">50%</span> necessarie ·{" "}
        <span className="text-wm-warning">30%</span> accessorie · <span className="text-wm-primary">20%</span> risparmio
      </p>

      <div className="space-y-4">
        {rows.map((row) => {
          const pct = row.target > 0 ? (row.actual / row.target) * 100 : 0;
          const isOver = row.actual > row.target;
          const barColor = isOver ? "bg-wm-destructive" : pct >= 85 ? "bg-wm-warning" : row.color;

          return (
            <div key={row.key}>
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-wm-muted-foreground">
                    {row.targetPct}% — {row.label}
                  </span>
                  <span className="text-xs text-wm-muted-foreground ml-2 hidden sm:inline">{row.description}</span>
                </div>
                <div className="text-xs text-right flex-shrink-0">
                  <span className={isOver ? "text-wm-destructive font-medium" : "text-wm-muted-foreground"}>
                    <PrivacyValue>{formatEur(row.actual)}</PrivacyValue>
                  </span>
                  <span className="text-wm-muted-foreground mx-1">/</span>
                  <span className="text-wm-muted-foreground">
                    <PrivacyValue>{formatEur(row.target)}</PrivacyValue>
                  </span>
                </div>
              </div>
              <Progress value={pct} aria-label={row.label} indicatorClassName={barColor} />
              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-wm-muted-foreground">
                  {pct.toFixed(0)}% del target
                  {isOver && (
                    <span className="text-wm-destructive ml-1">
                      ↑ +<PrivacyValue>{formatEur(row.actual - row.target)}</PrivacyValue>
                    </span>
                  )}
                  {!isOver && row.key === "savings" && pct < 100 && (
                    <span className="text-wm-primary ml-1">
                      ↓ <PrivacyValue>{formatEur(row.target - row.actual)}</PrivacyValue> in meno del previsto
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {uncategorized > 0 && (
        <div className="mt-4 pt-3 border-t border-wm-border">
          <p className="text-xs text-wm-warning/80">
            ⚠️ <PrivacyValue>{formatEur(uncategorized)}</PrivacyValue> in spese senza tipo assegnato — vai nelle
            categorie e imposta se sono &quot;necessarie&quot; o &quot;accessorie&quot; per un&apos;analisi precisa
          </p>
        </div>
      )}
    </Card>
  );
}
