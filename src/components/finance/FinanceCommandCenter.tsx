"use client";
import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { useTransactions } from "@/hooks/useTransactions";
import { useMonthStats } from "@/hooks/useMonthStats";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { Card } from "@/components/watermelon-ui/card";
import { Progress } from "@/components/watermelon-ui/progress";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { DataError } from "@/components/ui/DataError";
import { formatEur } from "@/lib/finance/presentation";

function MetricTrend({
  value,
  average,
  lowerIsBetter = false,
}: {
  value: number;
  average: number | null;
  lowerIsBetter?: boolean;
}) {
  if (average === null || (average === 0 && value !== 0)) {
    return (
      <p className="mt-2 text-xs text-wm-muted-foreground">
        {average === null ? "Media non disponibile" : "Confronto % non disponibile: media zero"}
      </p>
    );
  }

  const percent = average === 0 ? 0 : Math.round(((value - average) / Math.abs(average)) * 1000) / 10;
  const favorable = lowerIsBetter ? percent < 0 : percent > 0;
  const color = percent === 0 ? "text-wm-muted-foreground" : favorable ? "text-wm-primary" : "text-wm-destructive";
  const Icon = percent === 0 ? Minus : percent > 0 ? TrendingUp : TrendingDown;
  const formattedPercent = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(percent);

  return (
    <p
      className={`mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs ${color}`}
      title="Confronto con la media mensile dei mesi con movimenti, escluso quello selezionato."
    >
      <span className="inline-flex items-center gap-1 font-medium tabular-nums">
        <Icon size={14} aria-hidden="true" />
        {formattedPercent}%
      </span>
      <span className="text-wm-muted-foreground">vs media</span>
      <span className="sr-only">
        {percent === 0 ? "Andamento invariato" : favorable ? "Andamento favorevole" : "Andamento sfavorevole"}
      </span>
    </p>
  );
}

export function FinanceCommandCenter({ selectedMonth }: { selectedMonth: string }) {
  const monthQuery = useTransactions({ month: selectedMonth });
  const allQuery = useTransactions({});
  const { average } = useMonthStats(selectedMonth);
  const goalsQuery = useFinancialGoals();
  const { isPrivate } = usePrivacyMode();
  if (monthQuery.isError || allQuery.isError)
    return (
      <DataError
        onRetry={() => {
          void monthQuery.refetch();
          void allQuery.refetch();
        }}
      />
    );
  if (monthQuery.isLoading || allQuery.isLoading)
    return (
      <div className="space-y-5" aria-label="Caricamento panoramica">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  const transactions = monthQuery.data ?? [];
  const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = (allQuery.data ?? []).reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  const metrics = [
    { label: "Saldo totale", value: balance, icon: Wallet, hint: "Intero storico", average: undefined },
    {
      label: "Entrate",
      value: income,
      icon: ArrowDownLeft,
      hint: "Nel mese selezionato",
      average: average?.totalIncome ?? null,
    },
    {
      label: "Uscite",
      value: expense,
      icon: ArrowUpRight,
      hint: "Nel mese selezionato",
      average: average?.totalExpense ?? null,
      lowerIsBetter: true,
    },
    {
      label: "Saldo mensile",
      value: income - expense,
      icon: TrendingUp,
      hint: "Entrate meno uscite",
      average: average?.balance ?? null,
    },
  ];
  const [year, month] = selectedMonth.split("-").map(Number);
  const daily = new Map<number, { income: number; expense: number }>();
  const categories = new Map<string, { name: string; icon: string | null; total: number }>();
  for (const transaction of transactions) {
    const day = Number(transaction.date.slice(8, 10));
    const totals = daily.get(day) ?? { income: 0, expense: 0 };
    totals[transaction.type] += transaction.amount;
    daily.set(day, totals);
    if (transaction.type === "expense") {
      const key = transaction.category_id ?? "uncategorized";
      const category = categories.get(key) ?? {
        name: transaction.category?.name ?? "Senza categoria",
        icon: transaction.category?.icon ?? null,
        total: 0,
      };
      category.total += transaction.amount;
      categories.set(key, category);
    }
  }
  const series: { day: number; income: number; expense: number }[] = [];
  for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
    const previous = series.at(-1);
    const amounts = daily.get(day);
    series.push({
      day,
      income: (previous?.income ?? 0) + (amounts?.income ?? 0),
      expense: (previous?.expense ?? 0) + (amounts?.expense ?? 0),
    });
  }
  const topCategories = [...categories.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const goals = goalsQuery.data ?? [];
  const primaryGoal = goals.find((goal) => !goal.completed) ?? goals[0];
  const progress =
    primaryGoal && primaryGoal.target_amount > 0 ? (primaryGoal.current_amount / primaryGoal.target_amount) * 100 : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, hint, average: metricAverage, lowerIsBetter }) => (
          <Card key={label} className="p-4 md:p-5">
            <div className="mb-5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-wm-muted-foreground">{label}</span>
              <Icon size={17} className="text-wm-primary" />
            </div>
            <p className="wm-metric-value break-words">
              <PrivacyValue>{formatEur(value)}</PrivacyValue>
            </p>
            <p className="mt-2 text-xs text-wm-muted-foreground">{hint}</p>
            {metricAverage !== undefined &&
              (isPrivate ? (
                <p className="mt-2 text-xs text-wm-muted-foreground">Confronto nascosto</p>
              ) : (
                <MetricTrend value={value} average={metricAverage} lowerIsBetter={lowerIsBetter} />
              ))}
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card className="min-w-0 p-5 md:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="wm-card-title">Andamento del mese</h2>
              <p className="mt-1 text-xs text-wm-muted-foreground">Entrate e uscite cumulative, giorno per giorno.</p>
            </div>
            <div className="flex gap-4 text-xs text-wm-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-wm-primary" />
                Entrate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-wm-info" />
                Uscite
              </span>
            </div>
          </div>
          {isPrivate ? (
            <div className="flex h-72 items-center justify-center text-sm text-wm-muted-foreground">
              Grafico nascosto in modalità privacy
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-wm-muted-foreground">
              Nessun movimento nel mese selezionato.
            </div>
          ) : (
            <div className="h-72 w-full min-w-0">
              <ResponsiveChart width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--wm-border)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--wm-muted-foreground)", fontSize: 11 }}
                    minTickGap={25}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--wm-muted-foreground)", fontSize: 11 }}
                    tickFormatter={(value) => new Intl.NumberFormat("it-IT", { notation: "compact" }).format(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--wm-popover)",
                      color: "var(--wm-foreground)",
                      border: "1px solid var(--wm-border)",
                      borderRadius: 10,
                    }}
                    formatter={(value) => (typeof value === "number" ? formatEur(value) : String(value ?? ""))}
                    labelFormatter={(day) => `Giorno ${day}`}
                  />
                  <Area
                    name="Entrate"
                    type="stepAfter"
                    dataKey="income"
                    stroke="var(--wm-primary)"
                    fill="var(--wm-primary)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    name="Uscite"
                    type="stepAfter"
                    dataKey="expense"
                    stroke="var(--wm-info)"
                    fill="var(--wm-info)"
                    fillOpacity={0.06}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveChart>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="wm-card-title">Dove spendi di più</h2>
            <p className="mb-5 mt-1 text-xs text-wm-muted-foreground">Le cinque categorie principali.</p>
            <div className="space-y-4">
              {topCategories.length === 0 ? (
                <p className="text-sm text-wm-muted-foreground">Nessuna spesa nel mese.</p>
              ) : (
                topCategories.map(([id, category]) => (
                  <div key={id}>
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">
                        {category.icon} {category.name}
                      </span>
                      <PrivacyValue className="shrink-0 font-mono">{formatEur(category.total)}</PrivacyValue>
                    </div>
                    {!isPrivate && (
                      <Progress
                        aria-label={`Quota spese: ${category.name}`}
                        value={expense > 0 ? (category.total / expense) * 100 : 0}
                        className="h-1.5"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="wm-card-title">Obiettivo risparmio</h2>
              <Target size={17} className="text-wm-primary" />
            </div>
            {goalsQuery.isError ? (
              <DataError onRetry={() => void goalsQuery.refetch()} />
            ) : goalsQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : primaryGoal ? (
              <>
                <p className="text-sm">
                  {primaryGoal.icon} {primaryGoal.name}
                </p>
                <p className="my-4 font-mono text-2xl">
                  <PrivacyValue>{formatEur(primaryGoal.current_amount)}</PrivacyValue>
                </p>
                {!isPrivate && <Progress aria-label="Avanzamento obiettivo" value={progress} />}
                <p className="mt-3 text-xs text-wm-muted-foreground">
                  Traguardo: <PrivacyValue>{formatEur(primaryGoal.target_amount)}</PrivacyValue>
                </p>
              </>
            ) : (
              <p className="text-sm text-wm-muted-foreground">Crea un obiettivo nella tab Pianificazione.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
