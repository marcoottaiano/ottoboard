"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { BodyMeasurement } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
}

const SITES: { field: keyof BodyMeasurement; label: string; color: string }[] = [
  { field: "skinfold_chest", label: "Petto", color: "var(--wm-fitness)" },
  { field: "skinfold_abdomen", label: "Addome", color: "var(--wm-chart-pink)" },
  { field: "skinfold_thigh", label: "Coscia", color: "var(--wm-chart-purple)" },
  { field: "skinfold_tricep", label: "Tricipite", color: "var(--wm-chart-teal)" },
  { field: "skinfold_suprailiac", label: "Soprailiaca", color: "var(--wm-chart-blue)" },
  { field: "skinfold_subscapular", label: "Sottoscapolare", color: "var(--wm-success)" },
  { field: "skinfold_midaxillary", label: "Ascellare", color: "var(--wm-warning)" },
];

export function SkinfoldsTrendChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode();
  const [showIndividual, setShowIndividual] = useState(false);

  const filtered = [...measurements].filter((m) => SITES.some((s) => m[s.field] != null)).reverse();

  if (filtered.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Nessuna plicometria disponibile</p>
      </Card>
    );
  }

  const data = filtered.map((m) => {
    const vals = SITES.map((s) => m[s.field] as number | undefined).filter(Boolean) as number[];
    const sum = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0)) : null;
    const row: Record<string, string | number | null> = { date: m.measured_at.slice(5), sum };
    SITES.forEach((s) => {
      row[s.field as string] = (m[s.field] as number | undefined) ?? null;
    });
    return row;
  });

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="wm-card-title">Pliche nel tempo</h3>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setShowIndividual((v) => !v)}
          className="wm-secondary-action"
        >
          {showIndividual ? "Mostra somma" : "Dettaglio siti"}
        </Button>
      </div>
      <ResponsiveChart width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--wm-border)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }} />
          <YAxis
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
            formatter={(v, name) => [isPrivate ? "••••" : `${v} mm`, name === "sum" ? "Σ pliche" : String(name)]}
            labelStyle={{ color: "var(--wm-muted-foreground)" }}
          />
          {!showIndividual ? (
            <Line
              type="monotone"
              dataKey="sum"
              stroke="var(--wm-fitness)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--wm-fitness)" }}
              connectNulls
            />
          ) : (
            SITES.map((s) => (
              <Line
                key={s.field as string}
                type="monotone"
                dataKey={s.field as string}
                stroke={s.color}
                strokeWidth={1.5}
                dot={false}
                name={s.label}
                connectNulls
              />
            ))
          )}
        </LineChart>
      </ResponsiveChart>
    </Card>
  );
}
