"use client";

import { Activity, ArrowDownRight, ArrowUpRight, CalendarDays, Route, Timer } from "lucide-react";
import { useWeekStats } from "@/hooks/useWeekStats";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { ActivityBadge } from "./ActivityBadge";

function duration(hours: number) {
  const minutes = Math.round(hours * 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

function Comparison({ current, previous }: { current: number; previous: number }) {
  const isPrivate = usePrivacyMode((state) => state.isPrivate);
  if (isPrivate) return <span className="text-wm-muted-foreground">Confronto nascosto</span>;
  if (previous === 0) return <span className="text-wm-muted-foreground">Nessuna base di confronto</span>;
  const difference = Math.round(((current - previous) / previous) * 100);
  const Icon = difference < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span
        className={`inline-flex items-center gap-1 font-medium ${difference === 0 ? "text-wm-muted-foreground" : difference > 0 ? "text-wm-success" : "text-wm-destructive"}`}
      >
        {difference !== 0 && <Icon size={14} aria-hidden="true" />}
        {difference > 0 ? "+" : ""}
        {difference}%
      </span>
      <span className="text-wm-muted-foreground">vs sett. precedente</span>
    </span>
  );
}

export function FitnessWeekSummary() {
  const { current, previous, isLoading, isError, refetch } = useWeekStats();
  if (isError) return <DataError onRetry={() => void refetch()} />;
  if (isLoading || !current || !previous) {
    return (
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4"
        role="status"
        aria-label="Caricamento riepilogo settimanale"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  const average = current.count ? current.durationHours / current.count : 0;
  const metrics = [
    {
      label: "Allenamenti",
      value: String(current.count),
      icon: Activity,
      current: current.count,
      previous: previous.count,
    },
    {
      label: "Distanza totale",
      value: `${current.distanceKm.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`,
      icon: Route,
      current: current.distanceKm,
      previous: previous.distanceKm,
    },
    {
      label: "Tempo in movimento",
      value: duration(current.durationHours),
      icon: Timer,
      current: current.durationHours,
      previous: previous.durationHours,
    },
    { label: "Durata media", value: current.count ? duration(average) : "—", icon: CalendarDays },
  ];

  return (
    <section aria-label="Riepilogo della settimana corrente">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="wm-section-title">Questa settimana</h2>
        <p className="text-xs text-wm-muted-foreground">
          Settimana corrente · confronto con l’intera settimana precedente
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, current: metric, previous: baseline }) => (
          <Card key={label} className="flex min-w-0 flex-col gap-5 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-medium text-wm-muted-foreground sm:text-sm">{label}</h3>
              <Icon size={18} className="shrink-0 text-wm-primary" aria-hidden="true" />
            </div>
            <PrivacyValue className="wm-metric-value">{value}</PrivacyValue>
            <div className="mt-auto text-xs">
              {metric !== undefined && baseline !== undefined ? (
                <Comparison current={metric} previous={baseline} />
              ) : (
                <span className="text-wm-muted-foreground">Per allenamento · settimana corrente</span>
              )}
            </div>
          </Card>
        ))}
      </div>
      {current.count > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-wm-muted-foreground">
          <span>Sport della settimana</span>
          {Object.entries(current.typeCounts).map(([type, count]) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <ActivityBadge type={type} />
              <PrivacyValue>× {count}</PrivacyValue>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
