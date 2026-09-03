"use client";
import Link from "next/link";
import { ArrowUpRight, Dumbbell, Wallet } from "lucide-react";
import { useMonthStats } from "@/hooks/useMonthStats";
import { useWeekStats } from "@/hooks/useWeekStats";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { Progress } from "@/components/watermelon-ui/progress";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { RemindersWidget } from "./RemindersWidget";
import { currentMonth, formatEur } from "@/lib/finance/presentation";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

const WEEKLY_TARGET = 5;
export function OverviewPulse() {
  const week = useWeekStats();
  const month = useMonthStats(currentMonth());
  const { isPrivate } = usePrivacyMode();
  const sessions = week.current?.count ?? 0;
  const balance = month.current?.balance ?? 0;
  return (
    <section aria-label="Riepilogo personale" className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="flex min-w-0 flex-col p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="wm-card-title">Allenamento</h2>
          <Dumbbell size={18} className="text-wm-fitness" />
        </div>
        {week.isError ? (
          <DataError onRetry={() => void week.refetch()} />
        ) : week.isLoading ? (
          <Skeleton className="h-28" />
        ) : (
          <>
            <p className="wm-metric-value">
              <PrivacyValue>{sessions}</PrivacyValue>
              <span className="ml-2 text-sm font-normal text-wm-muted-foreground">/ {WEEKLY_TARGET} sessioni</span>
            </p>
            <p className="mb-5 mt-2 text-sm text-wm-muted-foreground">
              <PrivacyValue>
                {week.current?.distanceKm.toLocaleString("it-IT", { maximumFractionDigits: 1 }) ?? "0"} km
              </PrivacyValue>{" "}
              questa settimana
            </p>
            {!isPrivate && (
              <Progress
                aria-label="Obiettivo settimanale di allenamento"
                value={Math.min((sessions / WEEKLY_TARGET) * 100, 100)}
                indicatorClassName="bg-wm-fitness"
              />
            )}
          </>
        )}
        <Link href="/fitness" className="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-sm text-wm-fitness">
          Apri Fitness
          <ArrowUpRight size={15} />
        </Link>
      </Card>
      <Card className="flex min-w-0 flex-col p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="wm-card-title">Saldo del mese</h2>
          <Wallet size={18} className="text-wm-success" />
        </div>
        {month.isError ? (
          <DataError onRetry={() => void month.refetch()} />
        ) : month.isLoading ? (
          <Skeleton className="h-28" />
        ) : (
          <>
            <p
              className={`wm-metric-value ${isPrivate ? "" : balance < 0 ? "text-wm-destructive" : "text-wm-success"}`}
            >
              <PrivacyValue>{formatEur(balance)}</PrivacyValue>
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-wm-border pt-4 text-sm">
              <div>
                <dt className="text-wm-muted-foreground">Entrate</dt>
                <dd className="mt-1 font-mono">
                  <PrivacyValue>{formatEur(month.current?.totalIncome ?? 0)}</PrivacyValue>
                </dd>
              </div>
              <div>
                <dt className="text-wm-muted-foreground">Uscite</dt>
                <dd className="mt-1 font-mono">
                  <PrivacyValue>{formatEur(month.current?.totalExpense ?? 0)}</PrivacyValue>
                </dd>
              </div>
            </dl>
          </>
        )}
        <Link href="/finance" className="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-sm text-wm-success">
          Apri Finanze
          <ArrowUpRight size={15} />
        </Link>
      </Card>
      <Card className="min-w-0 lg:col-span-2 xl:col-span-1">
        <RemindersWidget />
      </Card>
    </section>
  );
}
