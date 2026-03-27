'use client'

import { useState } from 'react'
import { Plus, Plane } from 'lucide-react'
import { useTrips } from '@/hooks/useTrips'
import { TripCard } from '@/components/travel/TripCard'
import { TripListEmptyState } from '@/components/travel/TripListEmptyState'
import { TripFormModal } from '@/components/travel/TripFormModal'
import type { Trip } from '@/types/travel'

export default function TravelPage() {
  const { data: trips = [], isLoading } = useTrips()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Plane size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Viaggi</h1>
            <p className="text-xs text-white/40">Pianifica i tuoi viaggi</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all duration-200 text-sm font-medium"
        >
          <Plus size={15} />
          Nuovo viaggio
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <TripListEmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onEdit={() => setEditingTrip(trip)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <TripFormModal onClose={() => setShowCreateModal(false)} />
      )}
      {editingTrip && (
        <TripFormModal
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </div>
  )
}
