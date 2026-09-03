"use client";

import { useState } from "react";
import { ChartNoAxesCombined, ClipboardList, PersonStanding, TrendingUp } from "lucide-react";
import { ActivityHeatmap } from "@/components/fitness/ActivityHeatmap";
import { ActivityList } from "@/components/fitness/ActivityList";
import { HeartRateChart } from "@/components/fitness/HeartRateChart";
import { LastActivityCard } from "@/components/fitness/LastActivityCard";
import { PaceTrendChart } from "@/components/fitness/PaceTrendChart";
import { StravaConnect } from "@/components/fitness/StravaConnect";
import { FitnessWeekSummary } from "@/components/fitness/FitnessWeekSummary";
import { WeeklyVolumeChart } from "@/components/fitness/WeeklyVolumeChart";
import { BodyMeasurementsTab } from "@/components/fitness/BodyMeasurementsTab";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/watermelon-ui/tabs";

type FitnessTab = "overview" | "activities" | "analysis" | "body";

const FITNESS_TABS = [
  { value: "overview", label: "Panoramica", icon: ChartNoAxesCombined },
  { value: "activities", label: "Registro", icon: ClipboardList },
  { value: "analysis", label: "Analisi", icon: TrendingUp },
  { value: "body", label: "Corpo", icon: PersonStanding },
] satisfies { value: FitnessTab; label: string; icon: typeof TrendingUp }[];

export function FitnessContent() {
  const [tab, setTab] = useState<FitnessTab>("overview");
  const [visited, setVisited] = useState<Set<FitnessTab>>(() => new Set(["overview"]));

  function changeTab(value: string) {
    const next = FITNESS_TABS.find((item) => item.value === value)?.value;
    if (!next) return;
    setTab(next);
    setVisited((previous) => (previous.has(next) ? previous : new Set([...previous, next])));
  }

  return (
    <div className="wm-page">
      <PageHeader
        eyebrow="Performance personale"
        title="Fitness"
        description="La tua settimana, i tuoi allenamenti e i progressi nel tempo."
        actions={tab !== "body" ? <StravaConnect mode="compact" /> : undefined}
      />
      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList aria-label="Vista fitness">
          {FITNESS_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" forceMount hidden={tab !== "overview"}>
          <div className="space-y-6">
            <FitnessWeekSummary />
            <div className="grid items-stretch gap-5 xl:grid-cols-3">
              <section className="min-w-0 xl:col-span-2" aria-label="Volume settimanale">
                <WeeklyVolumeChart />
              </section>
              <section className="min-w-0" aria-label="Ultima attività">
                <LastActivityCard />
              </section>
            </div>
            <ActivityHeatmap />
          </div>
        </TabsContent>
        {visited.has("activities") && (
          <TabsContent value="activities" forceMount hidden={tab !== "activities"}>
            <ActivityList />
          </TabsContent>
        )}
        {visited.has("analysis") && (
          <TabsContent value="analysis" forceMount hidden={tab !== "analysis"}>
            <div className="mb-5">
              <h2 className="wm-section-title">Dentro la corsa</h2>
              <p className="mt-1 text-sm text-wm-muted-foreground">
                Passo e frequenza cardiaca delle corse sincronizzate con Strava.
              </p>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="min-w-0" aria-label="Andamento del passo">
                <PaceTrendChart />
              </section>
              <section className="min-w-0" aria-label="Frequenza cardiaca">
                <HeartRateChart />
              </section>
            </div>
          </TabsContent>
        )}
        {visited.has("body") && (
          <TabsContent value="body" forceMount hidden={tab !== "body"}>
            <BodyMeasurementsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
