"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Card } from "@/components/watermelon-ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import type { BodyMeasurement } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
}

// true = un valore che CALA è positivo (es. vita, fianchi, grasso)
// false = un valore che CRESCE è positivo (es. braccio, coscia, massa magra)
const METRICS: { field: keyof BodyMeasurement; label: string; lowerIsBetter: boolean }[] = [
  { field: "circ_waist", label: "Vita", lowerIsBetter: true },
  { field: "circ_hip", label: "Fianchi", lowerIsBetter: true },
  { field: "circ_arm", label: "Braccio", lowerIsBetter: false },
  { field: "circ_thigh", label: "Coscia", lowerIsBetter: false },
  { field: "circ_calf", label: "Polpaccio", lowerIsBetter: false },
  { field: "circ_chest", label: "Petto", lowerIsBetter: false },
  { field: "lean_mass_kg", label: "Massa magra", lowerIsBetter: false },
  { field: "fat_mass_kg", label: "Massa grassa", lowerIsBetter: true },
  { field: "weight_kg", label: "Peso", lowerIsBetter: true },
];

export function MeasurementsDeltaChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode();
  const sorted = [...measurements].reverse(); // ASC
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (!first || first === last) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Servono almeno 2 sessioni per vedere le variazioni</p>
      </Card>
    );
  }

  const data = METRICS.flatMap(({ field, label, lowerIsBetter }) => {
    const v0 = first[field] as number | undefined;
    const v1 = last[field] as number | undefined;
    if (v0 == null || v1 == null) return [];
    const delta = Math.round((v1 - v0) * 10) / 10;
    if (delta === 0) return [];
    const isGood = lowerIsBetter ? delta < 0 : delta > 0;
    return [{ label, delta, isGood }];
  });

  if (data.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Nessuna variazione tra la prima e l&apos;ultima sessione</p>
      </Card>
    );
  }

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="wm-card-title">Variazioni dalla prima sessione</h3>
        <span className="text-[10px] text-wm-muted-foreground">
          {first.measured_at} → {last.measured_at}
        </span>
      </div>
      <ResponsiveChart width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--wm-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
            tickFormatter={(v) => (isPrivate ? "••" : `${v}`)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }}
            width={56}
          />
          <ReferenceLine x={0} stroke="var(--wm-border)" />
          <Tooltip
            contentStyle={{
              background: "var(--wm-popover)",
              border: "1px solid var(--wm-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [isPrivate ? "••••" : `${Number(v) > 0 ? "+" : ""}${v}`, "Variazione"]}
            labelStyle={{ color: "var(--wm-muted-foreground)" }}
          />
          <Bar dataKey="delta" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.isGood ? "var(--wm-success)" : "var(--wm-destructive)"} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveChart>
    </Card>
  );
}
