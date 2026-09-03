"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Card } from "@/components/watermelon-ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { BodyMeasurement } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
}

function movingAverage(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / window) * 10) / 10;
  });
}

export function WeightChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode();
  const filtered = [...measurements].filter((m) => m.weight_kg != null).reverse();

  if (filtered.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Nessun dato peso disponibile</p>
      </Card>
    );
  }

  const weights = filtered.map((m) => m.weight_kg!);
  const maValues = movingAverage(weights, Math.min(7, filtered.length));

  const data = filtered.map((m, i) => ({
    date: m.measured_at.slice(5), // MM-DD
    peso: m.weight_kg,
    media: maValues[i],
  }));

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <h3 className="wm-card-title">Peso nel tempo</h3>
      <ResponsiveChart width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--wm-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }} />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
            tickFormatter={(v) => (isPrivate ? "••" : `${v}`)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--wm-popover)",
              border: "1px solid var(--wm-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v, name) => [isPrivate ? "••••" : `${v} kg`, name === "peso" ? "Peso" : "Media 7gg"]}
            labelStyle={{ color: "var(--wm-muted-foreground)" }}
          />
          <Line
            type="monotone"
            dataKey="peso"
            stroke="var(--wm-fitness)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--wm-fitness)" }}
            name="peso"
          />
          <Line
            type="monotone"
            dataKey="media"
            stroke="var(--wm-chart-pink)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            name="media"
            connectNulls
          />
        </LineChart>
      </ResponsiveChart>
    </Card>
  );
}
