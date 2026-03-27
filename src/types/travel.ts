// ─── Trip ────────────────────────────────────────────────────────────────────

export type TripStatus = 'bozza' | 'pianificato' | 'in_corso' | 'completato'

export interface Trip {
  id: string
  user_id: string
  nome: string
  cover_photo_url: string | null
  stato: TripStatus
  data_inizio: string | null  // DATE YYYY-MM-DD
  data_fine: string | null    // DATE YYYY-MM-DD
  partecipanti: number
  share_token: string | null
  created_at: string
}

export interface CreateTripInput {
  nome: string
  cover_photo_url?: string | null
  stato?: TripStatus
  data_inizio?: string | null
  data_fine?: string | null
  partecipanti?: number
}

export interface UpdateTripInput extends Partial<CreateTripInput> {
  share_token?: string | null
}

// ─── Places ──────────────────────────────────────────────────────────────────

export type PlaceTipo = 'ristorante' | 'bar' | 'attrazione'

export interface TripPlace {
  id: string
  trip_id: string
  user_id: string
  tipo: PlaceTipo
  nome: string
  maps_url: string | null
  lat: number | null
  lon: number | null
  descrizione: string | null
  prezzo_per_persona: number | null
  created_at: string
}

export interface CreatePlaceInput {
  trip_id: string
  tipo: PlaceTipo
  nome: string
  maps_url?: string | null
  lat?: number | null
  lon?: number | null
  descrizione?: string | null
  prezzo_per_persona?: number | null
}

export type UpdatePlaceInput = Partial<Omit<CreatePlaceInput, 'trip_id'>>

// ─── Accommodations ───────────────────────────────────────────────────────────

export interface TripAccommodation {
  id: string
  trip_id: string
  user_id: string
  nome: string
  check_in: string   // DATE YYYY-MM-DD
  check_out: string  // DATE YYYY-MM-DD
  prezzo_totale: number | null
  link_booking: string | null
  maps_url: string | null
  lat: number | null
  lon: number | null
  includi_in_stima: boolean
  created_at: string
}

export interface CreateAccommodationInput {
  trip_id: string
  nome: string
  check_in: string
  check_out: string
  prezzo_totale?: number | null
  link_booking?: string | null
  maps_url?: string | null
  lat?: number | null
  lon?: number | null
  includi_in_stima?: boolean
}

export type UpdateAccommodationInput = Partial<Omit<CreateAccommodationInput, 'trip_id'>>

// ─── Transports ──────────────────────────────────────────────────────────────

export type TransportCategoria = 'outbound' | 'locale'
export type TransportPrezzoTipo = 'per_persona' | 'totale'

export interface TripTransport {
  id: string
  trip_id: string
  user_id: string
  categoria: TransportCategoria
  nome: string
  prezzo: number | null
  prezzo_tipo: TransportPrezzoTipo
  descrizione: string | null
  created_at: string
}

export interface CreateTransportInput {
  trip_id: string
  categoria: TransportCategoria
  nome: string
  prezzo?: number | null
  prezzo_tipo?: TransportPrezzoTipo
  descrizione?: string | null
}

export type UpdateTransportInput = Partial<Omit<CreateTransportInput, 'trip_id'>>
