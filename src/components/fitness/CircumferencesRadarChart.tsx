"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/watermelon-ui/card";
import { useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from "recharts";
import type { BodyMeasurement } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
}

const CIRC_FIELDS: { field: keyof BodyMeasurement; label: string }[] = [
  { field: "circ_neck", label: "Collo" },
  { field: "circ_chest", label: "Petto" },
  { field: "circ_arm", label: "Braccio" },
  { field: "circ_forearm", label: "Avambraccio" },
  { field: "circ_waist", label: "Vita" },
  { field: "circ_hip", label: "Fianchi" },
  { field: "circ_thigh", label: "Coscia" },
  { field: "circ_calf", label: "Polpaccio" },
];

export function CircumferencesRadarChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode();
  const withCirc = measurements.filter((m) => CIRC_FIELDS.some((f) => m[f.field] != null));

  const [dateA, setDateA] = useState<string>(withCirc[0]?.measured_at ?? "");
  const [dateB, setDateB] = useState<string>(withCirc[1]?.measured_at ?? "");

  if (withCirc.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Nessuna circonferenza disponibile</p>
      </Card>
    );
  }

  const selectedDateA = withCirc.some((m) => m.measured_at === dateA) ? dateA : withCirc[0].measured_at;
  const selectedDateB = withCirc.some((m) => m.measured_at === dateB) ? dateB : "";
  const mA = withCirc.find((m) => m.measured_at === selectedDateA);
  const mB = withCirc.find((m) => m.measured_at === selectedDateB);

  // Calcola max per normalizzazione
  const maxValues: Record<string, number> = {};
  CIRC_FIELDS.forEach(({ field, label }) => {
    const vals = withCirc
      .map((m) => m[field])
      .filter((value): value is number => typeof value === "number" && value > 0);
    maxValues[label] = vals.length ? Math.max(...vals) : 1;
  });

  const radarData = CIRC_FIELDS.map(({ field, label }) => ({
    subject: label,
    A: typeof mA?.[field] === "number" ? Math.round((mA[field] / maxValues[label]) * 100) : null,
    B: typeof mB?.[field] === "number" ? Math.round((mB[field] / maxValues[label]) * 100) : null,
    rawA: mA?.[field],
    rawB: mB?.[field],
  }));

  const dateOptions = [...new Set(withCirc.map((m) => m.measured_at))];

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="wm-card-title">Radar circonferenze</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-fitness" />
            <Select
              aria-label="Prima sessione da confrontare"
              value={selectedDateA}
              onChange={setDateA}
              options={dateOptions.map((date) => ({ value: date, label: date }))}
              showPlaceholder={false}
            />
          </div>
          {dateOptions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-wm-chart-teal" />
              <Select
                aria-label="Seconda sessione da confrontare"
                value={selectedDateB}
                onChange={setDateB}
                options={dateOptions.map((date) => ({ value: date, label: date }))}
                placeholder="Nessun confronto"
              />
            </div>
          )}
        </div>
      </div>
      <ResponsiveChart width="100%" height={200}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <PolarGrid stroke="var(--wm-border)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--wm-muted-foreground)" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name={selectedDateA}
            dataKey="A"
            stroke="var(--wm-fitness)"
            fill="var(--wm-fitness)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {mB && (
            <Radar
              name={selectedDateB}
              dataKey="B"
              stroke="var(--wm-chart-teal)"
              fill="var(--wm-chart-teal)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          )}
          <Tooltip
            contentStyle={{
              background: "var(--wm-popover)",
              border: "1px solid var(--wm-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(_v, _name, props) => {
              const raw =
                _name === dateA
                  ? (props.payload as { rawA?: number })?.rawA
                  : (props.payload as { rawB?: number })?.rawB;
              if (isPrivate) return raw != null ? ["•••• cm", String(_name)] : ["—", String(_name)];
              return raw != null ? [`${raw} cm`, String(_name)] : ["—", String(_name)];
            }}
          />
        </RadarChart>
      </ResponsiveChart>
    </Card>
  );
}
