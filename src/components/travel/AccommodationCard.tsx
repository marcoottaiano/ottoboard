'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useDeleteAccommodation, useToggleIncludiInStima, findOverlap } from '@/hooks/useTripAccommodations'
import type { TripAccommodation } from '@/types/travel'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  accommodation: TripAccommodation
  allAccommodations: TripAccommodation[]
  onEdit: () => void
}

export function AccommodationCard({ accommodation, allAccommodations, onEdit }: Props) {
  const deleteAccommodation = useDeleteAccommodation()
  const toggleStima = useToggleIncludiInStima()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [overlapError, setOverlapError] = useState<string | null>(null)

  useEffect(() => {
    if (!confirmDelete) return
    const t = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(t)
  }, [confirmDelete])

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteAccommodation.mutate({ id: accommodation.id, tripId: accommodation.trip_id })
  }

  const handleToggleStima = () => {
    const nextVal = !accommodation.includi_in_stima
    if (nextVal) {
      // Enabling — check for overlap with other active accommodations
      const activeOthers = allAccommodations.filter(
        (a) => a.id !== accommodation.id && a.includi_in_stima
      )
      const overlap = findOverlap(
        accommodation.check_in,
        accommodation.check_out,
        activeOthers
      )
      if (overlap) {
        setOverlapError(`Date sovrapposte con ${overlap.nome}`)
        return
      }
    }
    setOverlapError(null)
    toggleStima.mutate({
      id: accommodation.id,
      tripId: accommodation.trip_id,
      includi_in_stima: nextVal,
    })
  }

  return (
    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.10] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{accommodation.nome}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {formatDate(accommodation.check_in)} → {formatDate(accommodation.check_out)}
          </p>
          {accommodation.prezzo_totale != null && (
            <p className="text-xs text-white/35 mt-0.5">
              Totale: €{accommodation.prezzo_totale.toFixed(2)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {accommodation.maps_url && (
            <a
              href={accommodation.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
              title="Apri in Maps"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
            title="Modifica"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Includi in stima toggle */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-white/40">Includi in stima costi</span>
          {overlapError && (
            <span className="text-[10px] text-red-400">{overlapError}</span>
          )}
        </div>
        <button
          onClick={handleToggleStima}
          disabled={toggleStima.isPending}
          className={[
            'relative w-9 h-5 rounded-full transition-all duration-200 disabled:opacity-50',
            accommodation.includi_in_stima ? 'bg-blue-500' : 'bg-white/[0.10]',
          ].join(' ')}
          aria-label="Toggle includi in stima"
        >
          <span
            className={[
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200',
              accommodation.includi_in_stima ? 'left-4' : 'left-0.5',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Delete */}
      <div className="mt-2 flex justify-end">
        {confirmDelete ? (
          <button
            onClick={handleDelete}
            disabled={deleteAccommodation.isPending}
            className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-2 py-0.5 rounded-lg transition-all duration-200"
          >
            Conferma eliminazione
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-[11px] text-white/25 hover:text-red-400 hover:bg-red-500/10 px-2 py-0.5 rounded-lg transition-all duration-200"
          >
            <Trash2 size={11} />
            Elimina
          </button>
        )}
      </div>
    </div>
  )
}
