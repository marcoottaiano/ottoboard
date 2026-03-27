'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTripAccommodations } from '@/hooks/useTripAccommodations'
import { AccommodationCard } from './AccommodationCard'
import { AccommodationFormModal } from './AccommodationFormModal'
import type { TripAccommodation } from '@/types/travel'

interface Props {
  tripId: string
}

export function AlloggiTab({ tripId }: Props) {
  const { data: accommodations = [], isLoading } = useTripAccommodations(tripId)
  const [showModal, setShowModal] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<TripAccommodation | null>(null)

  const handleEdit = (accommodation: TripAccommodation) => {
    setEditingAccommodation(accommodation)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAccommodation(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60">
          {accommodations.length > 0
            ? `${accommodations.length} alloggi`
            : 'Nessun alloggio'}
        </h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all duration-200"
        >
          <Plus size={13} />
          Aggiungi
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : accommodations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/30">Nessun alloggio aggiunto. Aggiungi il primo!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accommodations.map((acc) => (
            <AccommodationCard
              key={acc.id}
              accommodation={acc}
              allAccommodations={accommodations}
              onEdit={() => handleEdit(acc)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AccommodationFormModal
          tripId={tripId}
          accommodation={editingAccommodation}
          existingAccommodations={accommodations}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
