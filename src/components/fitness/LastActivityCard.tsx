"use client";

import { DataError } from "@/components/ui/DataError";
import { useActivities } from "@/hooks/useActivities";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { ExternalLink, Heart, Timer, TrendingUp, Flame, Activity } from "lucide-react";
import { ActivityBadge } from "./ActivityBadge";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/watermelon-ui/button";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { ActivityModal } from "./ActivityModal";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return "—";
  const seconds = Math.round(secPerKm);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-wm-muted/60 p-3">
      <span className="wm-metric-label flex items-center gap-1">
        {icon} {label}
      </span>
      <PrivacyValue className="mt-2 block font-mono text-sm font-medium tabular-nums text-wm-foreground">
        {value}
      </PrivacyValue>
    </div>
  );
}

function SkeletonCard({ bare = false }: { bare?: boolean }) {
  const cls = bare ? "p-5 animate-pulse h-full" : "wm-panel-flat p-5 animate-pulse h-full";
  return (
    <div className={cls}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 bg-wm-muted rounded w-16" />
          <div className="h-4 bg-wm-muted rounded w-32" />
        </div>
        <div className="h-6 bg-wm-muted rounded w-48" />
        <div className="grid grid-cols-2 gap-3 mt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-wm-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LastActivityCard({ bare = false }: { bare?: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { data: activities, isLoading, isError, refetch } = useActivities({ limit: 1 });
  const { lastSyncedAt, isConnectionError } = useStravaConnection();

  if (isError) return <DataError onRetry={() => void refetch()} />;
  if (isLoading) return <SkeletonCard bare={bare} />;

  const activity = activities?.[0];

  if (!activity) {
    const emptyClass = bare
      ? "p-5 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[160px]"
      : "wm-panel-flat p-5 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[260px]";
    return (
      <div className={emptyClass}>
        <Activity size={24} className="text-wm-muted-foreground" />
        <p className="text-xs text-wm-muted-foreground">Nessun allenamento sincronizzato</p>
        <Link href="/profile" className="text-xs text-wm-fitness/70 hover:text-wm-fitness transition-colors">
          Connetti Strava →
        </Link>
      </div>
    );
  }

  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null;

  const outerClass = bare
    ? "p-5 flex flex-col gap-4 overflow-hidden"
    : "wm-panel-flat h-full border-t-2 border-t-wm-primary p-5 sm:p-6 flex flex-col gap-5 overflow-hidden";

  return (
    <div className={outerClass}>
      {/* Header: badge tipo + data + sync status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ActivityBadge type={activity.type} />
          <span className="text-xs text-wm-muted-foreground">{formatDate(activity.start_date)}</span>
        </div>
        <SyncStatusBadge lastSyncedAt={lastSyncedAt} hasError={isConnectionError} />
      </div>

      {/* Nome attività */}
      <div>
        <p className="wm-eyebrow mb-2">Ultima attività</p>
        <h3 className="truncate text-lg font-semibold text-wm-foreground">{activity.name}</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Durata" value={formatDuration(activity.moving_time)} icon={<Timer size={11} />} />
        {distanceKm && <Stat label="Distanza" value={`${distanceKm} km`} />}
        {Boolean(activity.average_heartrate || activity.max_heartrate) && (
          <Stat
            label="FC media / max"
            value={`${activity.average_heartrate ? Math.round(activity.average_heartrate) : "—"} / ${activity.max_heartrate ? Math.round(activity.max_heartrate) : "—"} bpm`}
            icon={<Heart size={11} />}
          />
        )}
        {Boolean(activity.average_pace && distanceKm) && (
          <Stat label="Pace medio" value={formatPace(activity.average_pace)} icon={<TrendingUp size={11} />} />
        )}
        {activity.calories != null && (
          <Stat label="Calorie" value={`${activity.calories} kcal`} icon={<Flame size={11} />} />
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-wm-border pt-4">
        {!bare && (
          <Button variant="outline" onClick={() => setDetailsOpen(true)}>
            Dettagli attività
          </Button>
        )}
        {/* Link Strava */}
        <a
          href={`https://www.strava.com/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-fit items-center gap-1 text-xs text-fitness transition-colors hover:text-wm-foreground"
        >
          Vedi su Strava <ExternalLink size={11} />
        </a>
      </div>
      {detailsOpen && <ActivityModal activity={activity} onClose={() => setDetailsOpen(false)} />}
    </div>
  );
}
