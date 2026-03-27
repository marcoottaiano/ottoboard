'use client'

import { useMemo } from 'react'
import { useTrip } from '@/hooks/useTrips'
import { useTripAccommodations } from '@/hooks/useTripAccommodations'
import { useTripPlaces } from '@/hooks/useTripPlaces'
import { useTripTransports } from '@/hooks/useTripTransports'
import type { TripAccommodation, TripPlace, TripTransport } from '@/types/travel'

export interface AlloggioRow {
  id: string
  nome: string
  cost: number | null  // null → "—"
}

export interface AttrazioneRow {
  id: string
  nome: string
  prezzoPerPersona: number | null
  cost: number | null  // null → "—"
}

export interface TrasportoRow {
  id: string
  nome: string
  prezzo: number | null
  prezzoTipo: 'per_persona' | 'totale'
  cost: number | null  // null → "—"
}

export interface TripCostEstimate {
  alloggi: AlloggioRow[]
  alloggiTotal: number | null
  attrazioni: AttrazioneRow[]
  attrazioniTotal: number | null
  trasporti: TrasportoRow[]
  trasportiTotal: number | null
  totaleStimato: number | null
  quotaPerPersona: number | null
  isLoading: boolean
}

function sumNullable(values: (number | null)[]): number | null {
  const defined = values.filter((v): v is number => v !== null)
  return defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null
}

function buildAlloggioRows(accommodations: TripAccommodation[]): AlloggioRow[] {
  return accommodations
    .filter((a) => a.includi_in_stima)
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      cost: a.prezzo_totale ?? null,
    }))
}

function buildAttrazioneRows(places: TripPlace[], partecipanti: number): AttrazioneRow[] {
  return places
    .filter((p) => p.tipo === 'attrazione')
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      prezzoPerPersona: p.prezzo_per_persona ?? null,
      cost:
        p.prezzo_per_persona != null && partecipanti > 0
          ? p.prezzo_per_persona * partecipanti
          : null,
    }))
}

function buildTrasportoRows(transports: TripTransport[], partecipanti: number): TrasportoRow[] {
  return transports.map((t) => {
    let cost: number | null = null
    if (t.prezzo != null) {
      if (t.prezzo_tipo === 'per_persona' && partecipanti > 0) {
        cost = t.prezzo * partecipanti
      } else if (t.prezzo_tipo === 'totale') {
        cost = t.prezzo
      }
    }
    return {
      id: t.id,
      nome: t.nome,
      prezzo: t.prezzo ?? null,
      prezzoTipo: t.prezzo_tipo,
      cost,
    }
  })
}

export function useTripCostEstimate(tripId: string): TripCostEstimate {
  const { data: trip, isLoading: loadingTrip } = useTrip(tripId)
  const { data: accommodations = [], isLoading: loadingAcc } = useTripAccommodations(tripId)
  const { data: places = [], isLoading: loadingPlaces } = useTripPlaces(tripId)
  const { data: transports = [], isLoading: loadingTransports } = useTripTransports(tripId)

  // P-1: isLoading is a loading flag, not a computation input — kept outside useMemo
  const isLoading = loadingTrip || loadingAcc || loadingPlaces || loadingTransports

  // P-2: default to 0 so per-person guards (partecipanti > 0) correctly produce null
  //      when trip is still undefined. Never silently compute with a phantom count of 1.
  const partecipanti = trip?.partecipanti ?? 0

  const estimate = useMemo(() => {
    const alloggi = buildAlloggioRows(accommodations)
    const alloggiTotal = sumNullable(alloggi.map((r) => r.cost))

    const attrazioni = buildAttrazioneRows(places, partecipanti)
    const attrazioniTotal = sumNullable(attrazioni.map((r) => r.cost))

    const trasporti = buildTrasportoRows(transports, partecipanti)
    const trasportiTotal = sumNullable(trasporti.map((r) => r.cost))

    // Totale: sum the three section totals (treat null sections as 0 only if at least one is non-null)
    const sectionTotals = [alloggiTotal, attrazioniTotal, trasportiTotal]
    const totaleStimato = sumNullable(sectionTotals)

    const quotaPerPersona =
      totaleStimato != null && partecipanti > 0
        ? totaleStimato / partecipanti
        : null

    return {
      alloggi,
      alloggiTotal,
      attrazioni,
      attrazioniTotal,
      trasporti,
      trasportiTotal,
      totaleStimato,
      quotaPerPersona,
    }
  }, [trip, accommodations, places, transports, partecipanti])

  return { ...estimate, isLoading }
}
