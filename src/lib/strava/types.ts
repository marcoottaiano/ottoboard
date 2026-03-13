export interface StravaToken {
  access_token: string
  refresh_token: string
  expires_at: number // epoch seconds
  athlete: { id: number }
  scope: string
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  start_date: string
  distance: number
  moving_time: number
  elapsed_time: number
  average_heartrate?: number
  max_heartrate?: number
  average_speed?: number // m/s
  calories?: number
  kudos_count?: number
  map?: { summary_polyline?: string }
}

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile: string // avatar URL
}

export interface StravaTokenRow {
  user_id: string
  athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: string // ISO string
  scope: string | null
  last_synced_at: string | null
}
