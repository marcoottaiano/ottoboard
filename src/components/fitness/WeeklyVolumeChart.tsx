"use client";
import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { useCurrentTime } from "@/hooks/useCurrentTime";

import { useActivities } from "@/hooks/useActivities";
import { Activity, ActivityType } from "@/types";
import { Select, SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/watermelon-ui/button";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

const ACTIVITY_TYPE_OPTIONS: (SelectOption & { value: ActivityType | "all" })[] = [
  { value: "all", label: "Tutti" },
  { value: "Run", label: "Corsa" },
  { value: "WeightTraining", label: "Palestra" },
  { value: "Walk", label: "Camminata" },
  { value: "Hike", label: "Escursione" },
  { value: "Ski", label: "Sci" },
];

function getWeekLabel(date: Date) {
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeeklyData(activities: Activity[]) {
  const thisMonday = getMondayOf(new Date());
  const weeks: { label: string; km: number; ore: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekActivities = activities.filter((a) => {
      const d = new Date(a.start_date);
      return d >= weekStart && d <= weekEnd;
    });

    weeks.push({
      label: getWeekLabel(weekStart),
      km: weekActivities.reduce((acc, a) => acc + (a.distance ?? 0) / 1000, 0),
      ore: weekActivities.reduce((acc, a) => acc + a.moving_time / 3600, 0),
    });
  }

  return weeks;
}

export function WeeklyVolumeChart() {
  const now = useCurrentTime();
  const isPrivate = usePrivacyMode((state) => state.isPrivate);
  const [metric, setMetric] = useState<"km" | "ore">("ore");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  const twelveWeeksAgoStr = new Date(now - 84 * 86400000).toISOString().slice(0, 10);

  const {
    data: activities,
    isLoading,
    isError,
    refetch,
  } = useActivities({
    type: typeFilter === "all" ? undefined : typeFilter,
    after: twelveWeeksAgoStr,
  });

  const chartData = activities ? buildWeeklyData(activities) : [];

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <Card className="wm-panel-flat h-full min-h-[390px] overflow-hidden p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wm-eyebrow">Il tuo ritmo</p>
          <h3 className="wm-card-title mt-2">Volume settimanale</h3>
          <p className="mt-1 text-xs text-wm-muted-foreground">Ultime 12 settimane · ogni barra parte da lunedì</p>
        </div>
        <Select
          value={typeFilter}
          onChange={(value) => {
            const option = ACTIVITY_TYPE_OPTIONS.find((item) => item.value === value);
            if (option) setTypeFilter(option.value);
          }}
          aria-label="Tipo di attività del grafico"
          options={ACTIVITY_TYPE_OPTIONS}
          showPlaceholder={false}
          className="w-32"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-wm-muted p-1" role="group" aria-label="Metrica del volume">
          <Button
            size="auto"
            variant="ghost"
            aria-pressed={metric === "ore"}
            onClick={() => setMetric("ore")}
            className={metric === "ore" ? "bg-wm-card text-wm-primary shadow-xs" : "text-wm-muted-foreground"}
          >
            Durata
          </Button>
          <Button
            size="auto"
            variant="ghost"
            aria-pressed={metric === "km"}
            onClick={() => setMetric("km")}
            className={metric === "km" ? "bg-wm-card text-wm-primary shadow-xs" : "text-wm-muted-foreground"}
          >
            Distanza
          </Button>
        </div>
        <span className="text-xs text-wm-muted-foreground">
          {metric === "km" ? "Distanza in chilometri" : "Tempo in ore"}
        </span>
      </div>
      {isPrivate ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-wm-muted-foreground">
          Grafico nascosto in modalità privacy
        </div>
      ) : isLoading ? (
        <div className="h-[240px] bg-wm-muted rounded animate-pulse" />
      ) : !activities?.length ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-wm-muted-foreground">
          Nessuna attività nel periodo per questo sport
        </div>
      ) : (
        <ResponsiveChart width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--wm-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--wm-popover)",
                border: "1px solid var(--wm-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--wm-muted-foreground)" }}
              formatter={(value, name) => {
                const n = Number(value) || 0;
                const label =
                  name === "km"
                    ? `${n.toFixed(2)} km`
                    : `${Math.floor(Math.round(n * 60) / 60)}h ${Math.round(n * 60) % 60}m`;
                return [label, name === "km" ? "Distanza" : "Durata"];
              }}
            />
            <Bar dataKey={metric} name={metric} fill="var(--wm-fitness)" radius={[5, 5, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveChart>
      )}
    </Card>
  );
}
