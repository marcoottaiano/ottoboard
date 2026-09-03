"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Card } from "@/components/watermelon-ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import type { BodyMeasurement, UserBodyProfile } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
  profile: UserBodyProfile | null;
}

// Fasce di riferimento per % grasso
const MALE_ZONES = [
  { value: 6, label: "Atleta", color: "var(--wm-success)" },
  { value: 13, label: "Forma", color: "var(--wm-success)" },
  { value: 17, label: "Normale", color: "var(--wm-warning)" },
  { value: 25, label: "Alto", color: "var(--wm-destructive)" },
];
const FEMALE_ZONES = [
  { value: 14, label: "Atleta", color: "var(--wm-success)" },
  { value: 20, label: "Forma", color: "var(--wm-success)" },
  { value: 24, label: "Normale", color: "var(--wm-warning)" },
  { value: 31, label: "Alto", color: "var(--wm-destructive)" },
];

export function BodyFatChart({ measurements, profile }: Props) {
  const { isPrivate } = usePrivacyMode();
  const filtered = [...measurements].filter((m) => m.body_fat_pct != null).reverse();

  if (filtered.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Nessun dato % grasso disponibile</p>
      </Card>
    );
  }

  const data = filtered.map((m) => ({
    date: m.measured_at.slice(5),
    grasso: m.body_fat_pct,
  }));

  const zones = profile?.sex === "female" ? FEMALE_ZONES : MALE_ZONES;

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <h3 className="wm-card-title">% Grasso corporeo</h3>
      <ResponsiveChart width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--wm-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }} />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
            tickFormatter={(v) => (isPrivate ? "••" : `${v}%`)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--wm-popover)",
              border: "1px solid var(--wm-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [isPrivate ? "••••" : `${v}%`, "% Grasso"]}
            labelStyle={{ color: "var(--wm-muted-foreground)" }}
          />
          {zones.map((z) => (
            <ReferenceLine
              key={z.label}
              y={z.value}
              stroke={z.color}
              strokeDasharray="4 2"
              strokeOpacity={0.5}
              label={{ value: z.label, position: "right", fontSize: 9, fill: z.color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="grasso"
            stroke="var(--wm-fitness)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--wm-fitness)" }}
          />
        </LineChart>
      </ResponsiveChart>
    </Card>
  );
}
