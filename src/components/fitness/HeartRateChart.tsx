"use client";
import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { useCurrentTime } from "@/hooks/useCurrentTime";

import { useActivities } from "@/hooks/useActivities";
import { Activity } from "@/types";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

function buildChartData(activities: Activity[]) {
  return activities
    .filter((a) => a.average_heartrate)
    .slice(0, 30)
    .reverse()
    .map((a) => ({
      label: new Date(a.start_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
      fcMedia: Math.round(a.average_heartrate!),
      fcMax: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    }));
}

export function HeartRateChart() {
  const now = useCurrentTime();
  const isPrivate = usePrivacyMode((state) => state.isPrivate);
  const ninetyDaysAgoStr = new Date(now - 90 * 86400000).toISOString().slice(0, 10);

  // Solo corse
  const {
    data: activities,
    isLoading,
    isError,
    refetch,
  } = useActivities({
    after: ninetyDaysAgoStr,
    type: "Run",
  });

  const chartData = activities ? buildChartData(activities) : [];

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <Card className="wm-panel-flat h-full min-h-[390px] overflow-hidden p-5 sm:p-6">
      <div className="mb-4">
        <p className="wm-eyebrow">Cardio</p>
        <h3 className="wm-card-title mt-2">Frequenza cardiaca</h3>
        <p className="mt-1 text-xs text-wm-muted-foreground">Ultime 30 corse con dati cardio · 90 giorni · bpm</p>
        <div className="mt-4 flex gap-4 text-xs text-wm-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-wm-fitness" />
            Media
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-wm-destructive" />
            Massima
          </span>
        </div>
      </div>

      {isPrivate ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-wm-muted-foreground">
          Grafico nascosto in modalità privacy
        </div>
      ) : isLoading ? (
        <div className="h-[260px] bg-wm-muted rounded animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-wm-muted-foreground text-sm">
          Nessuna corsa con dati cardio
        </div>
      ) : (
        <ResponsiveChart width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fcMaxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--wm-destructive)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--wm-destructive)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fcMediaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--wm-fitness)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--wm-fitness)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--wm-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--wm-popover)",
                border: "1px solid var(--wm-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v, name) => [`${v} bpm`, name === "fcMedia" ? "FC Media" : "FC Max"]}
            />
            <Area
              type="monotone"
              dataKey="fcMax"
              name="fcMax"
              stroke="var(--wm-destructive)"
              strokeWidth={1}
              fill="url(#fcMaxGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="fcMedia"
              name="fcMedia"
              stroke="var(--wm-fitness)"
              strokeWidth={2}
              fill="url(#fcMediaGrad)"
              dot={{ r: 2, fill: "var(--wm-fitness)" }}
            />
          </AreaChart>
        </ResponsiveChart>
      )}
    </Card>
  );
}
