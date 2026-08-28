"use client";

import { useState } from "react";
import { ActivityHeatmap } from "@/components/fitness/ActivityHeatmap";
import { ActivityList } from "@/components/fitness/ActivityList";
import { HeartRateChart } from "@/components/fitness/HeartRateChart";
import { LastActivityCard } from "@/components/fitness/LastActivityCard";
import { PaceTrendChart } from "@/components/fitness/PaceTrendChart";
import { StravaConnect } from "@/components/fitness/StravaConnect";
import { WeekStatsCard } from "@/components/fitness/WeekStatsCard";
import { WeeklyVolumeChart } from "@/components/fitness/WeeklyVolumeChart";
import { BodyMeasurementsTab } from "@/components/fitness/BodyMeasurementsTab";
import { PageHeader } from "@/components/ui/PageHeader";

type Tab = "strava" | "body";

export function FitnessContent() {
  const [tab, setTab] = useState<Tab>("strava");

  return (
    <main className="ob-page fitness-page">
      <PageHeader
        eyebrow="Performance personale"
        title="Fitness"
        description="Allenamento e composizione corporea, letti insieme."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-0.5 rounded-lg border bg-white/[0.025] p-1" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="Vista fitness">
              <button onClick={() => setTab("strava")} role="tab" aria-selected={tab === "strava"} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "strava" ? "bg-fitness/15 text-fitness" : "text-muted hover:text-white"}`}>
                Attività
              </button>
              <button onClick={() => setTab("body")} role="tab" aria-selected={tab === "body"} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === "body" ? "bg-fitness/15 text-fitness" : "text-muted hover:text-white"}`}>
                Corpo
              </button>
            </div>
            {tab === "strava" && <StravaConnect mode="compact" />}
          </div>
        }
      />

      {/* Contenuto tab */}
      {tab === "strava" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="lg:col-span-7 xl:col-span-4" aria-label="Ultima attività">
            <LastActivityCard />
          </section>
          <section className="lg:col-span-5 xl:col-span-4" aria-label="Riepilogo settimanale">
            <WeekStatsCard />
          </section>
          <section className="lg:col-span-6 xl:col-span-4" aria-label="Andamento frequenza cardiaca">
            <HeartRateChart />
          </section>

          <section className="lg:col-span-6" aria-label="Volume settimanale">
            <WeeklyVolumeChart />
          </section>
          <section className="lg:col-span-6" aria-label="Andamento del passo">
            <PaceTrendChart />
          </section>

          <section className="lg:col-span-12" aria-label="Calendario attività">
            <ActivityHeatmap />
          </section>

          <section className="mt-4 lg:col-span-12" aria-labelledby="fitness-activity-register">
            <div className="ob-section-heading">
              <p id="fitness-activity-register" className="ob-section-title">
                Registro attività
              </p>
            </div>
            <ActivityList />
          </section>
        </div>
      ) : (
        <BodyMeasurementsTab />
      )}
    </main>
  );
}
