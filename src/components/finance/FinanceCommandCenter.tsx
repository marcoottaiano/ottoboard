"use client";

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useRef } from "react";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useTransactions } from "@/hooks/useTransactions";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { buildCsvString, downloadCsv } from "@/lib/finance/exportCsv";

interface FinanceCommandCenterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

function formatEur(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactEur(value: number) {
  return new Intl.NumberFormat("it-IT", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function FinanceCommandCenter({ selectedMonth, onMonthChange }: FinanceCommandCenterProps) {
  const { data: monthTransactions = [], isLoading: monthLoading, isFetching: monthFetching } = useTransactions({ month: selectedMonth });
  const { data: allTransactions = [], isLoading: allLoading } = useTransactions({});
  const { data: goals = [] } = useFinancialGoals();
  const isExporting = useRef(false);

  const monthIncome = monthTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthExpense = monthTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthNet = monthIncome - monthExpense;
  const totalBalance = allTransactions.reduce((sum, transaction) => sum + (transaction.type === "income" ? transaction.amount : -transaction.amount), 0);

  const [year, monthValue] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(year, monthValue, 0).getDate();
  const dailyTotals = new Map<number, { income: number; expense: number }>();
  for (const transaction of monthTransactions) {
    const day = Number(transaction.date.slice(8, 10));
    const current = dailyTotals.get(day) ?? { income: 0, expense: 0 };
    if (transaction.type === "income") current.income += transaction.amount;
    else current.expense += transaction.amount;
    dailyTotals.set(day, current);
  }

  let cumulativeIncome = 0;
  let cumulativeExpense = 0;
  const cashFlow = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const totals = dailyTotals.get(day);
    cumulativeIncome += totals?.income ?? 0;
    cumulativeExpense += totals?.expense ?? 0;
    return { day, income: cumulativeIncome, expense: cumulativeExpense, net: cumulativeIncome - cumulativeExpense };
  });

  const categoryTotals = new Map<string, { name: string; icon: string | null; total: number }>();
  for (const transaction of monthTransactions) {
    if (transaction.type !== "expense") continue;
    const key = transaction.category_id;
    const current = categoryTotals.get(key);
    if (current) current.total += transaction.amount;
    else categoryTotals.set(key, { name: transaction.category?.name ?? "Senza categoria", icon: transaction.category?.icon ?? null, total: transaction.amount });
  }
  const categories = Array.from(categoryTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxCategory = categories[0]?.total ?? 1;
  const primaryGoal = goals.find((goal) => !goal.completed) ?? goals[0];
  const goalProgress = primaryGoal ? Math.min((primaryGoal.current_amount / primaryGoal.target_amount) * 100, 100) : 0;
  const isLoading = monthLoading || allLoading;
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const handleExport = () => {
    if (monthTransactions.length === 0 || isExporting.current) return;
    isExporting.current = true;
    const [exportYear, exportMonth] = selectedMonth.split("-");
    downloadCsv(buildCsvString(monthTransactions), `ottoboard-finance-${exportMonth}-${exportYear}.csv`);
    isExporting.current = false;
  };

  if (isLoading) return <div className="ob-panel h-[560px] animate-pulse" />;

  return (
    <section className="ob-panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--border)" }}>
        <p className="ob-section-title capitalize">{monthLabel(selectedMonth)}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleExport} disabled={monthTransactions.length === 0 || monthFetching} className="ob-secondary-action mr-1">
            <Download size={13} />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
          <button onClick={() => onMonthChange(shiftMonth(selectedMonth, -1))} className="ob-icon-button size-8" aria-label="Mese precedente">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => onMonthChange(shiftMonth(selectedMonth, 1))} disabled={selectedMonth >= currentMonth} className="ob-icon-button size-8 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Mese successivo">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid border-b sm:grid-cols-2 xl:grid-cols-4" style={{ borderColor: "var(--border)" }}>
        {[
          { label: "Saldo totale", value: totalBalance, accent: "text-white" },
          { label: "Entrate", value: monthIncome, accent: "text-brand" },
          { label: "Uscite", value: monthExpense, accent: "text-white/75" },
          { label: "Netto", value: monthNet, accent: monthNet >= 0 ? "text-brand" : "text-red-400" },
        ].map((metric) => (
          <div key={metric.label} className="border-b p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0" style={{ borderColor: "var(--border)" }}>
            <p className="ob-metric-label">{metric.label}</p>
            <p className={`mt-2 font-mono text-2xl tabular-nums ${metric.accent}`}>
              <PrivacyValue>{formatEur(metric.value)}</PrivacyValue>
            </p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.35fr_1fr_.9fr]">
        <div className="border-b p-5 xl:border-b-0 xl:border-r" style={{ borderColor: "var(--border)" }}>
          <p className="ob-metric-label">Cash flow</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#65d6a6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#65d6a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(197,224,216,.07)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#789094", fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: "#789094", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={formatCompactEur} />
                <Area type="stepAfter" dataKey="income" stroke="#65d6a6" strokeWidth={2} fill="url(#financeIncome)" />
                <Area type="stepAfter" dataKey="expense" stroke="#789094" strokeWidth={1.5} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-5 text-[10px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-brand" />
              Entrate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted" />
              Uscite
            </span>
          </div>
        </div>

        <div className="border-b p-5 xl:border-b-0 xl:border-r" style={{ borderColor: "var(--border)" }}>
          <p className="ob-metric-label">Categorie di spesa</p>
          <div className="mt-5 space-y-4">
            {categories.length === 0 ? (
              <p className="text-xs text-muted">Nessuna spesa nel mese.</p>
            ) : (
              categories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-white/70">
                      {category.icon} {category.name}
                    </span>
                    <span className="font-mono text-muted">
                      <PrivacyValue>{formatEur(category.total)}</PrivacyValue>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.04]">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(category.total / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5">
          <p className="ob-metric-label">Obiettivo risparmio</p>
          {primaryGoal ? (
            <div className="mt-5">
              <p className="text-sm text-white/80">
                {primaryGoal.icon} {primaryGoal.name}
              </p>
              <p className="mt-5 font-mono text-2xl text-white">
                <PrivacyValue>{formatEur(primaryGoal.current_amount)}</PrivacyValue>
              </p>
              <p className="mt-1 text-xs text-muted">
                di <PrivacyValue>{formatEur(primaryGoal.target_amount)}</PrivacyValue>
              </p>
              <div className="mt-5 h-1.5 rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-brand" style={{ width: `${goalProgress}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-muted">{Math.round(goalProgress)}% completato</p>
            </div>
          ) : (
            <p className="mt-5 text-xs text-muted">Nessun obiettivo attivo.</p>
          )}
        </div>
      </div>
    </section>
  );
}
