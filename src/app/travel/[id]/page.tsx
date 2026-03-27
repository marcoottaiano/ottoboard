'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useTrip } from '@/hooks/useTrips'
import { TripDetailHeader } from '@/components/travel/TripDetailHeader'
import { TripDetailTabs, type TripTab } from '@/components/travel/TripDetailTabs'
import { LuoghiTab } from '@/components/travel/LuoghiTab'
import { AlloggiTab } from '@/components/travel/AlloggiTab'
import { TrasportiTab } from '@/components/travel/TrasportiTab'
import { ItinerarioTab } from '@/components/travel/ItinerarioTab'
import { StimaCostiTab } from '@/components/travel/StimaCostiTab'

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: trip, isLoading, error } = useTrip(id)
  const [activeTab, setActiveTab] = useState<TripTab>('luoghi')

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-white/[0.04] rounded-xl animate-pulse mb-4" />
        <div className="h-4 w-64 bg-white/[0.03] rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
        <p className="text-sm text-red-400">Viaggio non trovato.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <TripDetailHeader trip={trip} />
      <TripDetailTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'luoghi' && <LuoghiTab tripId={id} />}
      {activeTab === 'alloggi' && <AlloggiTab tripId={id} />}
      {activeTab === 'trasporti' && <TrasportiTab tripId={id} />}
      {activeTab === 'itinerario' && <ItinerarioTab trip={trip} />}
      {activeTab === 'stima-costi' && <StimaCostiTab tripId={id} />}
    </div>
  )
}
