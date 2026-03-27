'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, ArrowUpDown } from 'lucide-react'
import { useTripPlaces } from '@/hooks/useTripPlaces'
import { PlaceCard } from './PlaceCard'
import { PlaceFormModal } from './PlaceFormModal'
import type { TripPlace, PlaceTipo } from '@/types/travel'

const TIPO_OPTIONS: { value: PlaceTipo | 'tutti'; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'ristorante', label: 'Ristoranti' },
  { value: 'bar', label: 'Bar' },
  { value: 'attrazione', label: 'Attrazioni' },
]

interface Props {
  tripId: string
}

export function LuoghiTab({ tripId }: Props) {
  const { data: places = [], isLoading } = useTripPlaces(tripId)
  const [showModal, setShowModal] = useState(false)
  const [editingPlace, setEditingPlace] = useState<TripPlace | null>(null)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<PlaceTipo | 'tutti'>('tutti')
  const [sortByPrice, setSortByPrice] = useState(false)

  const filtered = useMemo(() => {
    let result = places

    if (tipoFilter !== 'tutti') {
      result = result.filter((p) => p.tipo === tipoFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.descrizione?.toLowerCase().includes(q) ?? false)
      )
    }

    if (sortByPrice) {
      result = [...result].sort((a, b) => {
        if (a.prezzo_per_persona == null && b.prezzo_per_persona == null) return 0
        if (a.prezzo_per_persona == null) return 1
        if (b.prezzo_per_persona == null) return -1
        return a.prezzo_per_persona - b.prezzo_per_persona
      })
    }

    return result
  }, [places, tipoFilter, search, sortByPrice])

  const handleEdit = (place: TripPlace) => {
    setEditingPlace(place)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPlace(null)
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca luogo..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500/30 transition-colors"
          />
        </div>

        <div className="flex gap-1">
          {TIPO_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTipoFilter(value)}
              className={[
                'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200',
                tipoFilter === value
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04] border border-transparent',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortByPrice((v) => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200',
            sortByPrice
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'text-white/35 border-white/[0.06] hover:text-white/60 hover:bg-white/[0.04]',
          ].join(' ')}
        >
          <ArrowUpDown size={11} />
          Prezzo
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all duration-200 ml-auto"
        >
          <Plus size={13} />
          Aggiungi
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/30">
            {places.length === 0
              ? 'Nessun luogo aggiunto. Aggiungi il primo!'
              : 'Nessun luogo corrisponde ai filtri.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((place) => (
            <PlaceCard key={place.id} place={place} onEdit={() => handleEdit(place)} />
          ))}
        </div>
      )}

      {showModal && (
        <PlaceFormModal
          tripId={tripId}
          place={editingPlace}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
