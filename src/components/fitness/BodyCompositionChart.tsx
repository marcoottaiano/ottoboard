"use client";

import { ResponsiveChart } from "@/components/ui/ResponsiveChart";
import { Card } from "@/components/watermelon-ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { BodyMeasurement } from "@/types";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

interface Props {
  measurements: BodyMeasurement[];
}

export function BodyCompositionChart({ measurements }: Props) {
  const { isPrivate } = usePrivacyMode();
  const filtered = [...measurements].filter((m) => m.fat_mass_kg != null && m.lean_mass_kg != null).reverse();

  if (filtered.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-56 items-center justify-center p-5">
        <p className="text-xs text-wm-muted-foreground">Inserisci peso + pliche per vedere la composizione</p>
      </Card>
    );
  }

  const data = filtered.map((m) => ({
    date: m.measured_at.slice(5),
    grassa: m.fat_mass_kg,
    magra: m.lean_mass_kg,
  }));

  return (
    <Card className="wm-panel-flat h-full space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="wm-card-title">Composizione corporea</h3>
        <div className="flex gap-3 text-[10px] text-wm-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-wm-chart-teal/60" />
            Massa magra
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-xs bg-fitness/60" />
            Massa grassa
          </span>
        </div>
      </div>
      <ResponsiveChart width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gradMagra" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--wm-chart-teal)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--wm-chart-teal)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradGrassa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--wm-fitness)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--wm-fitness)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
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
            formatter={(v, name) => [isPrivate ? "••••" : `${v} kg`, name === "magra" ? "Massa magra" : "Massa grassa"]}
            labelStyle={{ color: "var(--wm-muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="magra"
            stackId="1"
            stroke="var(--wm-chart-teal)"
            fill="url(#gradMagra)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="grassa"
            stackId="1"
            stroke="var(--wm-fitness)"
            fill="url(#gradGrassa)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveChart>
    </Card>
  );
}
