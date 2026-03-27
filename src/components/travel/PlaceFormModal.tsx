'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, Trash2 } from 'lucide-react'
import { useCreatePlace, useUpdatePlace, useDeletePlace } from '@/hooks/useTripPlaces'
import { parseMapsUrl } from '@/lib/travel/mapsUrlParser'
import type { TripPlace, PlaceTipo, CreatePlaceInput, UpdatePlaceInput } from '@/types/travel'

const PlaceMapPreview = dynamic(() => import('./PlaceMapPreview'), { ssr: false })

const TIPO_OPTIONS: { value: PlaceTipo; label: string }[] = [
  { value: 'ristorante', label: 'Ristorante' },
  { value: 'bar', label: 'Bar' },
  { value: 'attrazione', label: 'Attrazione' },
]

interface Props {
  tripId: string
  place?: TripPlace | null
  onClose: () => void
}

export function PlaceFormModal({ tripId, place, onClose }: Props) {
  const createPlace = useCreatePlace()
  const updatePlace = useUpdatePlace()
  const deletePlace = useDeletePlace()

  const [nome, setNome] = useState(place?.nome ?? '')
  const [tipo, setTipo] = useState<PlaceTipo>(place?.tipo ?? 'attrazione')
  const [mapsUrl, setMapsUrl] = useState(place?.maps_url ?? '')
  const [lat, setLat] = useState<string>(place?.lat != null ? String(place.lat) : '')
  const [lon, setLon] = useState<string>(place?.lon != null ? String(place.lon) : '')
  const [manualCoords, setManualCoords] = useState(false)
  const [descrizione, setDescrizione] = useState(place?.descrizione ?? '')
  const [prezzoPerPersona, setPrezzoPerPersona] = useState<string>(
    place?.prezzo_per_persona != null ? String(place.prezzo_per_persona) : ''
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse coordinates when maps URL changes
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

    const prezzo = prezzoPerPersona !== '' ? parseFloat(prezzoPerPersona) : null
    if (prezzoPerPersona !== '' && isNaN(prezzo!)) {
      setError('Il prezzo non è valido')
      return
    }

    if (place) {
      const updates: UpdatePlaceInput = {
        nome: nome.trim(),
        tipo,
        maps_url: mapsUrl.trim() || null,
        lat: hasCoords ? parsedLat : null,
        lon: hasCoords ? parsedLon : null,
        descrizione: descrizione.trim() || null,
        prezzo_per_persona: prezzo,
      }
      updatePlace.mutate(
        { id: place.id, tripId, updates },
        { onSuccess: onClose }
      )
    } else {
      const input: CreatePlaceInput = {
        trip_id: tripId,
        nome: nome.trim(),
        tipo,
        maps_url: mapsUrl.trim() || null,
        lat: hasCoords ? parsedLat : null,
        lon: hasCoords ? parsedLon : null,
        descrizione: descrizione.trim() || null,
        prezzo_per_persona: prezzo,
      }
      createPlace.mutate(input, { onSuccess: onClose })
    }
  }

  const handleDelete = () => {
    if (!place) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deletePlace.mutate(
      { id: place.id, tripId },
      { onSuccess: onClose }
    )
  }

  const isPending = createPlace.isPending || updatePlace.isPending || deletePlace.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">
            {place ? 'Modifica luogo' : 'Aggiungi luogo'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          >
            <X size={14} />
          </button>
        </div>

        {/* Map preview */}
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
              placeholder="Es. Trattoria da Mario"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as PlaceTipo)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#111]">
                  {o.label}
                </option>
              ))}
            </select>
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

          {/* Manual lat/lon */}
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

          {/* Descrizione */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Note, orari, consigli..."
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          {/* Prezzo per persona */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Prezzo per persona (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prezzoPerPersona}
              onChange={(e) => setPrezzoPerPersona(e.target.value)}
              placeholder="Es. 25"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {place ? (
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
                {isPending ? 'Salvataggio...' : place ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
