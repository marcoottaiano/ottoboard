"use client";

import { useWeekStats } from "@/hooks/useWeekStats";
import { Route, Timer, Dumbbell } from "lucide-react";
import { PrivacyValue } from "@/components/ui/PrivacyValue";

const TYPE_LABELS: Record<string, string> = {
  Run: "Corsa",
  WeightTraining: "Gym",
  Walk: "Walk",
  Hike: "Hike",
  Ski: "Sci",
};

function formatHoursDuration(totalHours: number): string {
  const h = Math.floor(totalHours);
  const min = Math.round((totalHours - h) * 60);
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h} h`;
  return `${h} h ${min} min`;
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-500 text-xs">→ 0%</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs ${isPositive ? "text-green-400" : "text-red-400"}`}>
      {isPositive ? "↑" : "↓"} {Math.abs(value)}% vs sett. prec.
    </span>
  );
}

function SkeletonCard({ bare = false }: { bare?: boolean }) {
  const cls = bare ? "p-5 animate-pulse h-full" : "ob-panel-flat p-5 animate-pulse h-full";
  return (
    <div className={cls}>
      <div className="h-4 bg-white/10 rounded w-32 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function WeekStatsCard({ bare = false }: { bare?: boolean }) {
  const { current, delta, isLoading } = useWeekStats();

  if (isLoading) return bare ? <SkeletonCard bare /> : <SkeletonCard />;

  const emptyClass = bare ? "p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]" : "ob-panel-flat p-5 flex items-center justify-center text-gray-500 h-full min-h-[260px]";

  if (!current) {
    return <div className={emptyClass}>Nessuna attività questa settimana</div>;
  }

  const typeEntries = Object.entries(current.typeCounts).sort((a, b) => b[1] - a[1]);

  const outerClass = bare ? "p-5 h-full flex flex-col overflow-hidden" : "ob-panel-flat p-5 h-full min-h-[260px] flex flex-col overflow-hidden";

  return (
    <div className={outerClass}>
      <div className="mb-4">
        <p className="ob-eyebrow">Carico allenamento</p>
        <h3 className="ob-card-title mt-2">Questa settimana</h3>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        {/* Allenamenti con breakdown tipi */}
        <div className="col-span-1 flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.025)" }}>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Dumbbell size={12} />
            Allenamenti
          </div>
          <span className="font-mono text-2xl font-medium tabular-nums text-white">
            <PrivacyValue>{current.count}</PrivacyValue>
          </span>
          <Delta value={delta?.count ?? 0} />
          {typeEntries.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              {typeEntries.map(([type, n]) => (
                <span key={type} className="text-[10px] text-gray-500 truncate">
                  {n}× {TYPE_LABELS[type] ?? type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Distanza */}
        <div className="flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.025)" }}>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Route size={12} />
            Distanza
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-medium tabular-nums text-white">
              <PrivacyValue>{current.distanceKm.toFixed(2)}</PrivacyValue>
            </span>
            <span className="text-xs text-gray-500">km</span>
          </div>
          <Delta value={delta?.distanceKm ?? 0} />
        </div>

        {/* Durata */}
        <div className="flex min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.025)" }}>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Timer size={12} />
            Durata totale
          </div>
          <span className="text-lg font-bold text-white leading-tight">
            <PrivacyValue>{formatHoursDuration(current.durationHours)}</PrivacyValue>
          </span>
          <Delta value={delta?.durationHours ?? 0} />
        </div>
      </div>
    </div>
  );
}
