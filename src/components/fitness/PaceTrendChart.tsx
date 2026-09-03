"use client";
import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useCurrentTime } from "@/hooks/useCurrentTime";

import { useActivities } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

const PERIODS = [
  { value: 30, label: "30g" },
  { value: 60, label: "60g" },
  { value: 90, label: "90g" },
  { value: 180, label: "6m" },
];

function formatPaceLabel(sec: number) {
  const seconds = Math.round(sec);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function linearTrend(data: { pace: number; index: number }[]): { m: number; b: number } {
  const n = data.length;
  if (n < 2) return { m: 0, b: 0 };
  const sumX = data.reduce((acc, d) => acc + d.index, 0);
  const sumY = data.reduce((acc, d) => acc + d.pace, 0);
  const sumXY = data.reduce((acc, d) => acc + d.index * d.pace, 0);
  const sumX2 = data.reduce((acc, d) => acc + d.index * d.index, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

function buildChartData(activities: Activity[]) {
  const runs = activities
    .filter((a) => a.type === "Run" && a.average_pace && a.distance && a.distance > 500)
    .slice(0, 20)
    .reverse();

  const points = runs.map((a, i) => ({
    label: new Date(a.start_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
    pace: Math.round(a.average_pace!),
    index: i,
  }));

  const { m, b } = linearTrend(points);

  return points.map((p) => ({
    ...p,
    trend: points.length > 1 ? Math.round(m * p.index + b) : undefined,
  }));
}

export function PaceTrendChart() {
  const now = useCurrentTime();
  const isPrivate = usePrivacyMode((state) => state.isPrivate);
  const [period, setPeriod] = useState(90);

  const afterStr = new Date(now - period * 86400000).toISOString().slice(0, 10);

  const { data: activities, isLoading, isError, refetch } = useActivities({ after: afterStr });

  const chartData = activities ? buildChartData(activities) : [];

  // Calcola dominio Y adattivo con buffer di 30 secondi
  const paceValues = chartData.flatMap((d) => [d.pace, ...(d.trend === undefined ? [] : [d.trend])]);
  const minPace = paceValues.length > 0 ? Math.min(...paceValues) - 30 : 0;
  const maxPace = paceValues.length > 0 ? Math.max(...paceValues) + 30 : 600;

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <Card className="wm-panel-flat h-full min-h-[390px] overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="wm-eyebrow">Ritmo</p>
          <h3 className="wm-card-title mt-2">Passo di corsa</h3>
          <p className="mt-1 text-xs text-wm-muted-foreground">Ultime 20 corse oltre 500 m · min/km</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              variant="ghost"
              size="auto"
              key={p.value}
              aria-pressed={period === p.value}
              aria-label={`Ultimi ${p.value} giorni`}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${period === p.value ? "bg-fitness/20 text-fitness" : "text-wm-muted-foreground hover:text-wm-foreground"}`}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-wm-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-wm-fitness" />
          Passo reale
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed border-wm-chart-purple" />
          Tendenza
        </span>
        <span>Più in alto = passo più veloce</span>
      </div>
      {isPrivate ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-wm-muted-foreground">
          Grafico nascosto in modalità privacy
        </div>
      ) : isLoading ? (
        <div className="h-[260px] bg-wm-muted rounded animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-wm-muted-foreground text-sm">
          Nessuna corsa nel periodo
        </div>
      ) : (
        <ResponsiveChart width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--wm-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              reversed
              domain={[minPace, maxPace]}
              tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatPaceLabel}
            />
            <Tooltip
              contentStyle={{
                background: "var(--wm-popover)",
                border: "1px solid var(--wm-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v, name) => [formatPaceLabel(Number(v)), name === "pace" ? "Pace reale" : "Tendenza"]}
            />
            <Line
              type="monotone"
              dataKey="pace"
              name="pace"
              stroke="var(--wm-fitness)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--wm-fitness)" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="trend"
              name="trend"
              stroke="var(--wm-chart-purple)"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              activeDot={false}
            />
          </LineChart>
        </ResponsiveChart>
      )}
    </Card>
  );
}
