"use client";

import { Activity } from "@/types";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
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
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

interface ActivityModalProps {
  activity: Activity;
  onClose: () => void;
}

export function ActivityModal({ activity, onClose }: ActivityModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="activity-detail-title">
      <div ref={dialogRef} tabIndex={-1} className="ob-panel max-h-[90vh] w-full max-w-lg overflow-y-auto outline-none">
        <div className="flex items-start justify-between border-b p-5" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActivityBadge type={activity.type} />
            </div>
            <h2 id="activity-detail-title" className="text-lg font-semibold text-white">
              {activity.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(activity.start_date).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button onClick={onClose} className="ob-icon-button" aria-label="Chiudi dettaglio attività">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activity.map_polyline && <PolylineMap polyline={activity.map_polyline} width={440} height={180} className="w-full h-44" />}

          <div>
            <Row label="Durata" value={formatDuration(activity.moving_time)} />
            {distanceKm && <Row label="Distanza" value={`${distanceKm} km`} />}
            {activity.average_pace && distanceKm && <Row label="Pace medio" value={formatPace(activity.average_pace)} />}
            {activity.average_heartrate && <Row label="FC media" value={`${Math.round(activity.average_heartrate)} bpm`} />}
            {activity.max_heartrate && <Row label="FC massima" value={`${Math.round(activity.max_heartrate)} bpm`} />}
            {activity.calories && <Row label="Calorie" value={`${activity.calories} kcal`} />}
            {activity.kudos_count !== null && activity.kudos_count !== undefined && <Row label="Kudos" value={String(activity.kudos_count)} />}
          </div>

          <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-fitness/30 bg-fitness/15 text-sm font-medium text-fitness transition-colors hover:bg-fitness/25">
            Apri su Strava <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
