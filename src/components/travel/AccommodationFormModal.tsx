'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, Trash2 } from 'lucide-react'
import {
  useCreateAccommodation,
  useUpdateAccommodation,
  useDeleteAccommodation,
  findOverlap,
} from '@/hooks/useTripAccommodations'
import { parseMapsUrl } from '@/lib/travel/mapsUrlParser'
import type {
  TripAccommodation,
  CreateAccommodationInput,
  UpdateAccommodationInput,
} from '@/types/travel'

const PlaceMapPreview = dynamic(() => import('./PlaceMapPreview'), { ssr: false })

interface Props {
  tripId: string
  accommodation?: TripAccommodation | null
  existingAccommodations: TripAccommodation[]
  onClose: () => void
}

export function AccommodationFormModal({
  tripId,
  accommodation,
  existingAccommodations,
  onClose,
}: Props) {
  const createAccommodation = useCreateAccommodation()
  const updateAccommodation = useUpdateAccommodation()
  const deleteAccommodation = useDeleteAccommodation()

  const [nome, setNome] = useState(accommodation?.nome ?? '')
  const [checkIn, setCheckIn] = useState(accommodation?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(accommodation?.check_out ?? '')
  const [prezzoTotale, setPrezzoTotale] = useState<string>(
    accommodation?.prezzo_totale != null ? String(accommodation.prezzo_totale) : ''
  )
  const [linkBooking, setLinkBooking] = useState(accommodation?.link_booking ?? '')
  const [mapsUrl, setMapsUrl] = useState(accommodation?.maps_url ?? '')
  const [lat, setLat] = useState<string>(
    accommodation?.lat != null ? String(accommodation.lat) : ''
  )
  const [lon, setLon] = useState<string>(
    accommodation?.lon != null ? String(accommodation.lon) : ''
  )
  const [manualCoords, setManualCoords] = useState(false)
  const [includiInStima, setIncludiInStima] = useState(accommodation?.includi_in_stima ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapsUrl.trim()) {
      setLat('')
      setLon('')
      setManualCoords(false)
      return
    }
    const parsed = parseMapsUrl(mapsUrl)
    if (parsed) {
      setLat(String(parsed.lat))
      setLon(String(parsed.lon))
      setManualCoords(false)
    } else {
      setLat('')
      setLon('')
      setManualCoords(true)
    }
  }, [mapsUrl])

  const parsedLat = parseFloat(lat)
  const parsedLon = parseFloat(lon)
  const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLon)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    if (!checkIn) {
      setError('Il check-in è obbligatorio')
      return
    }
    if (!checkOut) {
      setError('Il check-out è obbligatorio')
      return
    }
    if (checkOut <= checkIn) {
      setError('Il check-out deve essere successivo al check-in')
      return
    }

    const prezzo = prezzoTotale !== '' ? parseFloat(prezzoTotale) : null
    if (prezzoTotale !== '' && isNaN(prezzo!)) {
      setError('Il prezzo non è valido')
      return
    }

    // Overlap check
    const overlap = findOverlap(
      checkIn,
      checkOut,
      existingAccommodations,
      accommodation?.id
    )
    if (overlap) {
      setError(`Date sovrapposte con ${overlap.nome}`)
      return
    }

    if (accommodation) {
      const updates: UpdateAccommodationInput = {
        nome: nome.trim(),
        check_in: checkIn,
        check_out: checkOut,
        prezzo_totale: prezzo,
        link_booking: linkBooking.trim() || null,
        maps_url: mapsUrl.trim() || null,
        lat: hasCoords ? parsedLat : null,
        lon: hasCoords ? parsedLon : null,
        includi_in_stima: includiInStima,
      }
      updateAccommodation.mutate(
        { id: accommodation.id, tripId, updates },
        { onSuccess: onClose }
      )
    } else {
      const input: CreateAccommodationInput = {
        trip_id: tripId,
        nome: nome.trim(),
        check_in: checkIn,
        check_out: checkOut,
        prezzo_totale: prezzo,
        link_booking: linkBooking.trim() || null,
        maps_url: mapsUrl.trim() || null,
        lat: hasCoords ? parsedLat : null,
        lon: hasCoords ? parsedLon : null,
        includi_in_stima: includiInStima,
      }
      createAccommodation.mutate(input, { onSuccess: onClose })
    }
  }

  const handleDelete = () => {
    if (!accommodation) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteAccommodation.mutate(
      { id: accommodation.id, tripId },
      { onSuccess: onClose }
    )
  }

  const isPending =
    createAccommodation.isPending ||
    updateAccommodation.isPending ||
    deleteAccommodation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">
            {accommodation ? 'Modifica alloggio' : 'Aggiungi alloggio'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          >
            <X size={14} />
          </button>
        </div>

        {hasCoords && (
          <div className="px-5 pt-4">
            <PlaceMapPreview lat={parsedLat} lon={parsedLon} height={160} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Hotel Roma Centro"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Check-in / Check-out */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1.5">Check-in *</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1.5">Check-out *</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
          </div>

          {/* Prezzo totale */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Prezzo totale (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prezzoTotale}
              onChange={(e) => setPrezzoTotale(e.target.value)}
              placeholder="Es. 180"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Link Booking */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Link prenotazione</label>
            <input
              value={linkBooking}
              onChange={(e) => setLinkBooking(e.target.value)}
              placeholder="https://booking.com/..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Maps URL */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">URL Google Maps</label>
            <input
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
            {mapsUrl.trim() && manualCoords && (
              <p className="text-[11px] text-amber-400 mt-1.5">
                Coordinate non trovate — inserisci manualmente
              </p>
            )}
          </div>

          {manualCoords && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-white/50 mb-1.5">Latitudine</label>
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Es. 41.9028"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/50 mb-1.5">Longitudine</label>
                <input
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="Es. 12.4964"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Includi in stima */}
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-white/50">Includi in stima costi</span>
            <button
              type="button"
              onClick={() => setIncludiInStima((v) => !v)}
              className={[
                'relative w-9 h-5 rounded-full transition-all duration-200',
                includiInStima ? 'bg-blue-500' : 'bg-white/[0.10]',
              ].join(' ')}
              aria-label="Toggle includi in stima"
            >
              <span
                className={[
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200',
                  includiInStima ? 'left-4' : 'left-0.5',
                ].join(' ')}
              />
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {accommodation ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={[
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-200 disabled:opacity-50',
                  confirmDelete
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-white/30 border-white/[0.06] hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20',
                ].join(' ')}
              >
                <Trash2 size={12} />
                {confirmDelete ? 'Conferma' : 'Elimina'}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-4 py-1.5 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                {isPending ? 'Salvataggio...' : accommodation ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
