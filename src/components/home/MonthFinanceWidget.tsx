"use client";

import { DataError } from "@/components/ui/DataError";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMonthStats } from "@/hooks/useMonthStats";
import { TransactionWithCategory } from "@/types";
import Link from "next/link";
import { PrivacyValue } from "@/components/ui/PrivacyValue";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

interface CatStat {
  name: string;
  icon: string | null;
  total: number;
}

function getTop3Categories(transactions: TransactionWithCategory[]): CatStat[] {
  const map = new Map<string, CatStat>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const existing = map.get(t.category_id);
    if (existing) {
      existing.total += t.amount;
    } else {
      map.set(t.category_id, {
        name: t.category?.name ?? "—",
        icon: t.category?.icon ?? null,
        total: t.amount,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
}

export function MonthFinanceWidget() {
  const month = getCurrentMonth();
  const { data: transactions = [], isLoading, isError, refetch } = useTransactions({ month });
  const { current, delta, isLoading: loadingStats } = useMonthStats(month);

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
  const top3 = getTop3Categories(transactions);
  const maxCat = top3[0]?.total ?? 1;
  const balance = current?.balance ?? 0;
  const balancePositive = balance >= 0;

  if (isError) return <DataError onRetry={() => void refetch()} />;
  if (isLoading || loadingStats) {
    return (
      <div className="p-5 space-y-3 animate-pulse min-h-[200px]">
        <div className="h-4 bg-wm-muted rounded w-2/5" />
        <div className="h-8 bg-wm-muted rounded w-1/2" />
        <div className="h-4 bg-wm-muted rounded w-3/4 mt-1" />
        <div className="space-y-2 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-wm-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-xs text-wm-muted-foreground uppercase tracking-wide">Bilancio</p>
        <p className="text-xs text-wm-muted-foreground capitalize">{monthLabel}</p>
      </div>

      {/* Balance — main metric */}
      <div>
        <div className="flex items-end gap-3">
          <span className={`text-2xl font-bold ${balancePositive ? "text-wm-success" : "text-wm-destructive"}`}>
            <PrivacyValue>{formatEur(balance)}</PrivacyValue>
          </span>
          {delta && (
            <span
              className={`flex items-center gap-0.5 text-xs mb-0.5 ${
                delta.balance > 0 ? "text-wm-success" : "text-wm-destructive"
              }`}
            >
              {delta.balance > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(delta.balance)}% vs mese scorso
            </span>
          )}
        </div>

        {/* Income / Expense secondary row */}
        {current && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-wm-muted-foreground">
              <span className="text-wm-success/70">↑</span>{" "}
              <PrivacyValue>{formatEur(current.totalIncome)}</PrivacyValue>
            </span>
            <span className="text-xs text-wm-muted-foreground">
              <span className="text-wm-destructive/70">↓</span>{" "}
              <PrivacyValue>{formatEur(current.totalExpense)}</PrivacyValue>
            </span>
          </div>
        )}
      </div>

      {/* Top 3 expense categories */}
      {top3.length > 0 ? (
        <div className="space-y-2.5">
          {top3.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-wm-muted-foreground flex items-center gap-1.5">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </span>
                <span className="text-wm-muted-foreground">
                  <PrivacyValue>{formatEur(cat.total)}</PrivacyValue>
                </span>
              </div>
              <div className="h-1 rounded-full bg-wm-muted">
                <div
                  className="h-1 rounded-full bg-wm-success/50"
                  style={{ width: `${(cat.total / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-5">
          <Wallet size={24} className="text-wm-muted-foreground" />
          <p className="text-xs text-wm-muted-foreground">Nessun movimento questo mese</p>
          <Link href="/finance" className="text-xs text-wm-success/70 hover:text-wm-success transition-colors">
            Aggiungi transazione →
          </Link>
        </div>
      )}
    </div>
  );
}
