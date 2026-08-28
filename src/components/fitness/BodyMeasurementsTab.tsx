"use client";

import { useBodyMeasurements, useUserBodyProfile } from "@/hooks/useBodyMeasurements";
import { BodyCanvas } from "./BodyCanvas";
import { MeasurementForm } from "./MeasurementForm";
import { WeightChart } from "./WeightChart";
import { BodyCompositionChart } from "./BodyCompositionChart";
import { BodyFatChart } from "./BodyFatChart";
import { CircumferencesRadarChart } from "./CircumferencesRadarChart";
import { MeasurementsDeltaChart } from "./MeasurementsDeltaChart";
import { SkinfoldsTrendChart } from "./SkinfoldsTrendChart";
import { MeasurementHistoryTable } from "./MeasurementHistoryTable";

export function BodyMeasurementsTab() {
  const { data: measurements = [], isLoading } = useBodyMeasurements();
  const { data: profile } = useUserBodyProfile();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="ob-panel-flat h-56 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Canvas + Form */}
      <div className="ob-panel-flat flex min-h-[360px] flex-col items-center justify-center p-5 lg:col-span-5">
        <div className="mb-4 self-start">
          <p className="ob-eyebrow">Corpo</p>
          <h3 className="ob-card-title mt-2">Mappa corporea</h3>
        </div>
        <BodyCanvas measurements={measurements} />
      </div>
      <div className="lg:col-span-7">
        <MeasurementForm />
      </div>

      {/* Grafici peso e composizione */}
      <div className="lg:col-span-6">
        <WeightChart measurements={measurements} />
      </div>
      <div className="lg:col-span-6">
        <BodyCompositionChart measurements={measurements} />
      </div>

      {/* % grasso e radar */}
      <div className="lg:col-span-6">
        <BodyFatChart measurements={measurements} profile={profile ?? null} />
      </div>
      <div className="lg:col-span-6">
        <CircumferencesRadarChart measurements={measurements} />
      </div>

      {/* Delta e pliche */}
      <div className="lg:col-span-6">
        <MeasurementsDeltaChart measurements={measurements} />
      </div>
      <div className="lg:col-span-6">
        <SkinfoldsTrendChart measurements={measurements} />
      </div>

      {/* Tabella storico */}
      <div className="lg:col-span-12">
        <MeasurementHistoryTable measurements={measurements} />
      </div>
    </div>
  );
}
