'use client'

import { useBodyMeasurements, useUserBodyProfile } from '@/hooks/useBodyMeasurements'
import { BodyCanvas } from './BodyCanvas'
import { MeasurementForm } from './MeasurementForm'
import { WeightChart } from './WeightChart'
import { BodyCompositionChart } from './BodyCompositionChart'
import { BodyFatChart } from './BodyFatChart'
import { CircumferencesRadarChart } from './CircumferencesRadarChart'
import { MeasurementsDeltaChart } from './MeasurementsDeltaChart'
import { SkinfoldsTrendChart } from './SkinfoldsTrendChart'
import { MeasurementHistoryTable } from './MeasurementHistoryTable'

export function BodyMeasurementsTab() {
  const { data: measurements = [], isLoading } = useBodyMeasurements()
  const { data: profile } = useUserBodyProfile()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-48 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Canvas + Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-white mb-3 self-start">Mappa corporea</h3>
          <BodyCanvas measurements={measurements} />
        </div>
        <MeasurementForm />
      </div>

      {/* Grafici peso e composizione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <WeightChart measurements={measurements} />
        <BodyCompositionChart measurements={measurements} />
      </div>

      {/* % grasso e radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <BodyFatChart measurements={measurements} profile={profile ?? null} />
        <CircumferencesRadarChart measurements={measurements} />
      </div>

      {/* Delta e pliche */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <MeasurementsDeltaChart measurements={measurements} />
        <SkinfoldsTrendChart measurements={measurements} />
      </div>

      {/* Tabella storico */}
      <MeasurementHistoryTable measurements={measurements} />
    </div>
  )
}
