"use client";

import { Button } from "@/components/watermelon-ui/button";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { ExtendedBodyPart, Slug } from "react-muscle-highlighter";
import type { BodyMeasurement } from "@/types";
import { PrivacyValue } from "@/components/ui/PrivacyValue";

const Body = dynamic(() => import("./MuscleBody"), { ssr: false });

interface MeasurementInfo {
  field: keyof BodyMeasurement;
  label: string;
  unit: string;
}

interface ZoneDef {
  label: string;
  measurements: MeasurementInfo[];
}

const SLUG_ZONES: Partial<Record<Slug, ZoneDef>> = {
  neck: {
    label: "Collo",
    measurements: [{ field: "circ_neck", label: "Circonferenza", unit: "cm" }],
  },
  chest: {
    label: "Petto",
    measurements: [
      { field: "circ_chest", label: "Circonferenza", unit: "cm" },
      { field: "skinfold_chest", label: "Plica", unit: "mm" },
    ],
  },
  abs: {
    label: "Addome / Vita",
    measurements: [
      { field: "circ_waist", label: "Vita", unit: "cm" },
      { field: "skinfold_abdomen", label: "Plica addome", unit: "mm" },
    ],
  },
  obliques: {
    label: "Obliqui / Fianchi",
    measurements: [
      { field: "circ_waist", label: "Vita", unit: "cm" },
      { field: "skinfold_suprailiac", label: "Plica soprailiaca", unit: "mm" },
      { field: "skinfold_midaxillary", label: "Plica ascellare", unit: "mm" },
    ],
  },
  gluteal: {
    label: "Glutei / Fianchi",
    measurements: [{ field: "circ_hip", label: "Fianchi", unit: "cm" }],
  },
  adductors: {
    label: "Fianchi",
    measurements: [{ field: "circ_hip", label: "Fianchi", unit: "cm" }],
  },
  biceps: {
    label: "Braccio",
    measurements: [{ field: "circ_arm", label: "Circonferenza", unit: "cm" }],
  },
  triceps: {
    label: "Tricipite / Braccio",
    measurements: [
      { field: "circ_arm", label: "Circonferenza", unit: "cm" },
      { field: "skinfold_tricep", label: "Plica tricipite", unit: "mm" },
    ],
  },
  forearm: {
    label: "Avambraccio",
    measurements: [{ field: "circ_forearm", label: "Circonferenza", unit: "cm" }],
  },
  quadriceps: {
    label: "Coscia",
    measurements: [
      { field: "circ_thigh", label: "Circonferenza", unit: "cm" },
      { field: "skinfold_thigh", label: "Plica coscia", unit: "mm" },
    ],
  },
  hamstring: {
    label: "Coscia (posteriore)",
    measurements: [{ field: "circ_thigh", label: "Circonferenza", unit: "cm" }],
  },
  calves: {
    label: "Polpaccio",
    measurements: [{ field: "circ_calf", label: "Circonferenza", unit: "cm" }],
  },
  "upper-back": {
    label: "Schiena superiore",
    measurements: [{ field: "skinfold_subscapular", label: "Plica sottoscapolare", unit: "mm" }],
  },
};

interface Props {
  measurements: BodyMeasurement[];
}

export function BodyCanvas({ measurements }: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<Slug | null>(null);

  const latest = measurements[0] ?? null;
  const previous = measurements[1] ?? null;

  const getValue = (field: keyof BodyMeasurement) => latest?.[field] as number | undefined;

  const getDelta = (field: keyof BodyMeasurement): number | null => {
    const curr = latest?.[field] as number | undefined;
    const prev = previous?.[field] as number | undefined;
    if (curr == null || prev == null) return null;
    return Math.round((curr - prev) * 10) / 10;
  };

  // Build the set of slugs that have at least one measurement value
  const highlighted = new Set<Slug>();
  if (latest) {
    if (latest.circ_neck != null) highlighted.add("neck");
    if (latest.circ_chest != null || latest.skinfold_chest != null) highlighted.add("chest");
    if (latest.circ_waist != null || latest.skinfold_abdomen != null) highlighted.add("abs");
    if (latest.circ_waist != null || latest.skinfold_suprailiac != null || latest.skinfold_midaxillary != null)
      highlighted.add("obliques");
    if (latest.circ_hip != null) {
      highlighted.add("gluteal");
      highlighted.add("adductors");
    }
    if (latest.circ_arm != null) {
      highlighted.add("biceps");
      highlighted.add("triceps");
    }
    if (latest.skinfold_tricep != null) highlighted.add("triceps");
    if (latest.circ_forearm != null) highlighted.add("forearm");
    if (latest.circ_thigh != null || latest.skinfold_thigh != null) {
      highlighted.add("quadriceps");
      highlighted.add("hamstring");
    }
    if (latest.circ_calf != null) highlighted.add("calves");
    if (latest.skinfold_subscapular != null) highlighted.add("upper-back");
  }

  const data: ReadonlyArray<ExtendedBodyPart> = Array.from(highlighted).map((slug) => ({
    slug,
    color: "var(--wm-fitness)",
  }));

  const handlePress = (part: ExtendedBodyPart) => {
    const slug = part.slug as Slug;
    if (!slug || !SLUG_ZONES[slug]) return;
    setSelected((prev) => (prev === slug ? null : slug));
  };

  const selectedZone = selected ? SLUG_ZONES[selected] : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-wm-muted text-xs">
        {(["front", "back"] as const).map((v) => (
          <Button
            variant="ghost"
            size="auto"
            key={v}
            aria-pressed={view === v}
            onClick={() => {
              setView(v);
              setSelected(null);
            }}
            className={`px-3 py-1 rounded-md transition-colors ${
              view === v ? "bg-wm-fitness/30 text-wm-fitness" : "text-wm-muted-foreground hover:text-wm-foreground"
            }`}
          >
            {v === "front" ? "Anteriore" : "Posteriore"}
          </Button>
        ))}
      </div>

      {/* Body figure */}
      <div className="flex w-full min-w-0 justify-center [&_svg]:max-w-full [&_svg]:h-auto">
        <Body
          data={data}
          side={view}
          gender="male"
          scale={0.7}
          colors={["var(--wm-fitness)", "var(--wm-fitness)"]}
          defaultFill="var(--wm-body-fill)"
          defaultStroke="var(--wm-body-stroke)"
          defaultStrokeWidth={0.5}
          border="var(--wm-body-stroke)"
          onBodyPartPress={handlePress}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs text-wm-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-wm-fitness/40 border border-wm-fitness/60" />
          Con dato
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--wm-body-fill)] border border-[var(--wm-body-stroke)]" />
          Nessun dato
        </span>
        <span className="text-wm-muted-foreground">Tocca per dettagli</span>
      </div>

      {/* Selected zone info card */}
      {selectedZone && (
        <div className="w-full rounded-xl border border-wm-fitness/20 bg-wm-fitness/5 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-wm-fitness">{selectedZone.label}</p>
          <div className="space-y-1.5">
            {selectedZone.measurements.map((m) => {
              const val = getValue(m.field);
              const delta = getDelta(m.field);
              return (
                <div key={m.field as string} className="flex items-center justify-between">
                  <span className="text-xs text-wm-muted-foreground">{m.label}</span>
                  {val != null ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-wm-foreground font-medium">
                        <PrivacyValue>
                          {val} {m.unit}
                        </PrivacyValue>
                      </span>
                      {delta !== null && (
                        <span
                          className={
                            delta > 0
                              ? "text-wm-success"
                              : delta < 0
                                ? "text-wm-destructive"
                                : "text-wm-muted-foreground"
                          }
                        >
                          <PrivacyValue>
                            {delta > 0 ? "+" : ""}
                            {delta}
                          </PrivacyValue>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-wm-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
          {latest?.measured_at && (
            <p className="text-[10px] text-wm-muted-foreground pt-0.5">Ultima misurazione: {latest.measured_at}</p>
          )}
        </div>
      )}
    </div>
  );
}
