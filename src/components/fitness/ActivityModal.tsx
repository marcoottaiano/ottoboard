"use client";

import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { AppDialog } from "@/components/ui/AppDialog";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { Activity } from "@/types";
import { ExternalLink } from "lucide-react";

import { ActivityBadge } from "./ActivityBadge";
import { PolylineMap } from "./PolylineMap";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return "—";
  const seconds = Math.round(secPerKm);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-wm-border">
      <span className="text-wm-muted-foreground text-sm">{label}</span>
      <span className="text-wm-foreground text-sm font-medium">
        <PrivacyValue>{value}</PrivacyValue>
      </span>
    </div>
  );
}

interface ActivityModalProps {
  activity: Activity;
  onClose: () => void;
}

export function ActivityModal({ activity, onClose }: ActivityModalProps) {
  const isPrivate = usePrivacyMode((state) => state.isPrivate);
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null;

  return (
    <AppDialog
      title={activity.name}
      description={new Date(activity.start_date).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
      onClose={onClose}
      className="max-w-lg"
    >
      <ActivityBadge type={activity.type} />

      <div className="space-y-4">
        {activity.map_polyline && !isPrivate && (
          <PolylineMap polyline={activity.map_polyline} width={440} height={180} className="w-full h-44" />
        )}

        <div>
          <Row label="Durata" value={formatDuration(activity.moving_time)} />
          {distanceKm && <Row label="Distanza" value={`${distanceKm} km`} />}
          {Boolean(activity.average_pace && distanceKm) && (
            <Row label="Pace medio" value={formatPace(activity.average_pace)} />
          )}
          {Boolean(activity.average_heartrate) && (
            <Row label="FC media" value={`${Math.round(activity.average_heartrate ?? 0)} bpm`} />
          )}
          {Boolean(activity.max_heartrate) && (
            <Row label="FC massima" value={`${Math.round(activity.max_heartrate ?? 0)} bpm`} />
          )}
          {activity.calories != null && <Row label="Calorie" value={`${activity.calories} kcal`} />}
          {activity.kudos_count !== null && activity.kudos_count !== undefined && (
            <Row label="Kudos" value={String(activity.kudos_count)} />
          )}
        </div>

        <a
          href={`https://www.strava.com/activities/${activity.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-fitness/30 bg-fitness/15 text-sm font-medium text-fitness transition-colors hover:bg-fitness/25"
        >
          Apri su Strava <ExternalLink size={14} />
        </a>
      </div>
    </AppDialog>
  );
}
