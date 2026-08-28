'use client'

import { useState } from 'react'
import { ActivityHeatmap } from '@/components/fitness/ActivityHeatmap'
import { ActivityList } from '@/components/fitness/ActivityList'
import { HeartRateChart } from '@/components/fitness/HeartRateChart'
import { LastActivityCard } from '@/components/fitness/LastActivityCard'
import { PaceTrendChart } from '@/components/fitness/PaceTrendChart'
import { StravaConnect } from '@/components/fitness/StravaConnect'
import { WeekStatsCard } from '@/components/fitness/WeekStatsCard'
import { WeeklyVolumeChart } from '@/components/fitness/WeeklyVolumeChart'
import { BodyMeasurementsTab } from '@/components/fitness/BodyMeasurementsTab'
import { PageHeader } from '@/components/ui/PageHeader'

type Tab = 'strava' | 'body'

export function FitnessContent() {
  const [tab, setTab] = useState<Tab>('strava')

  return (
    <main className="ob-page">
      <PageHeader
        eyebrow="Performance personale"
        title="Fitness"
        description="Allenamento e composizione corporea, letti insieme."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-lg border bg-white/[0.025] p-1" style={{ borderColor: 'var(--border)' }} role="tablist" aria-label="Vista fitness">
            <button
              onClick={() => setTab('strava')}
              role="tab"
              aria-selected={tab === 'strava'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'strava'
                  ? 'bg-fitness/15 text-fitness'
                  : 'text-muted hover:text-white'
              }`}
            >
              Attività
            </button>
            <button
              onClick={() => setTab('body')}
              role="tab"
              aria-selected={tab === 'body'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'body'
                  ? 'bg-fitness/15 text-fitness'
                  : 'text-muted hover:text-white'
              }`}
            >
              Corpo
            </button>
          </div>
          {tab === 'strava' && <StravaConnect mode="compact" />}
        </div>
        )}
      />

      {/* Contenuto tab */}
      {tab === 'strava' ? (
        <>
          {/* Hero: ultima attività + stats settimanali */}
          <div className="ob-section-heading"><p className="ob-section-title">Ultima attività</p></div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr] items-stretch">
            <LastActivityCard />
            <WeekStatsCard />
          </div>

          {/* Grafici volume e pace */}
          <div className="ob-section-heading mt-9"><p className="ob-section-title">Carico e ritmo</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WeeklyVolumeChart />
            <PaceTrendChart />
          </div>

          {/* FC e heatmap */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HeartRateChart />
            <ActivityHeatmap />
          </div>

          {/* Lista attività */}
          <div className="ob-section-heading mt-9"><p className="ob-section-title">Registro attività</p></div>
          <ActivityList />
        </>
      ) : (
        <BodyMeasurementsTab />
      )}
    </main>
  )
}
