"use client";

import { useActivities } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { Trophy } from "lucide-react";

interface DistanceBracket {
  label: string;
  target: number; // metri
  tolerance: number; // percentuale (es. 0.12 = ±12%)
}

const BRACKETS: DistanceBracket[] = [
  { label: "5 km", target: 5000, tolerance: 0.12 },
  { label: "10 km", target: 10000, tolerance: 0.12 },
  { label: "Mezza maratona", target: 21097, tolerance: 0.08 },
  { label: "Maratona", target: 42195, tolerance: 0.05 },
];

interface Record {
  label: string;
  time: string;
  pace: string;
  date: string;
  activityId: number;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(secPerKm: number) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function computeRecords(activities: Activity[]): Record[] {
  const runs = activities.filter((a) => a.type === "Run" && a.distance && a.moving_time && a.average_pace);

  return BRACKETS.flatMap((bracket) => {
    const matching = runs.filter((a) => {
      const dist = a.distance!;
      return dist >= bracket.target * (1 - bracket.tolerance) && dist <= bracket.target * (1 + bracket.tolerance);
    });

    if (matching.length === 0) return [];

    // Miglior pace = record
    const best = matching.reduce((prev, curr) => ((curr.average_pace ?? Infinity) < (prev.average_pace ?? Infinity) ? curr : prev));

    return [
      {
        label: bracket.label,
        time: formatDuration(best.moving_time),
        pace: formatPace(best.average_pace!),
        date: new Date(best.start_date).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        activityId: best.id,
      },
    ];
  });
}

export function PersonalRecordsCard() {
  const { data: activities, isLoading } = useActivities({ type: "Run" });

  const records = activities ? computeRecords(activities) : [];

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-orange-400" />
        <h3 className="text-sm font-medium text-gray-400">Personal records (corsa)</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="py-8 text-center text-gray-600 text-sm">Nessun record trovato — sincronizza le tue attività</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BRACKETS.map((bracket) => {
            const record = records.find((r) => r.label === bracket.label);
            return (
              <div key={bracket.label} className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
                <span className="text-xs font-medium text-orange-400">{bracket.label}</span>
                {record ? (
                  <>
                    <span className="text-base font-bold text-white">{record.time}</span>
                    <span className="text-xs text-gray-400">{record.pace}</span>
                    <span className="text-[10px] text-gray-600 mt-0.5">{record.date}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-600 mt-1">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
