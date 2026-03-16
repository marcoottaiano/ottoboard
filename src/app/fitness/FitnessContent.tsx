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

type Tab = 'strava' | 'body'

export function FitnessContent() {
  const [tab, setTab] = useState<Tab>('strava')

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Fitness</h1>
          {/* Tab selector */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              onClick={() => setTab('strava')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'strava'
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Strava
            </button>
            <button
              onClick={() => setTab('body')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tab === 'body'
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Corpo
            </button>
          </div>
        </div>
        {tab === 'strava' && <StravaConnect mode="compact" />}
      </div>

      {/* Contenuto tab */}
      {tab === 'strava' ? (
        <>
          {/* Hero: ultima attività + stats settimanali */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-stretch">
            <LastActivityCard />
            <WeekStatsCard />
          </div>

          {/* Grafici volume e pace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <WeeklyVolumeChart />
            <PaceTrendChart />
          </div>

          {/* FC e heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            <HeartRateChart />
            <ActivityHeatmap />
          </div>

          {/* Lista attività */}
          <ActivityList />
        </>
      ) : (
        <BodyMeasurementsTab />
      )}
    </main>
  )
}
