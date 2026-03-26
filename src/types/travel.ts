export type TripStatus = 'bozza' | 'pianificato' | 'in_corso' | 'completato'

export interface Trip {
  id: string
  user_id: string
  nome: string
  cover_photo_url: string | null
  stato: TripStatus
  data_inizio: string | null  // DATE as string YYYY-MM-DD
  data_fine: string | null    // DATE as string YYYY-MM-DD
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
