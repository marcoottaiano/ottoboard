import { SupabaseClient } from '@supabase/supabase-js'
import { StravaTokenRow } from './types'

const STRAVA_API = 'https://www.strava.com/api/v3'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minuti

async function refreshToken(
  refreshTokenStr: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error('Strava token refresh fallito')
  return res.json()
}

export async function getStravaToken(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  const { data, error } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single<Pick<StravaTokenRow, 'access_token' | 'refresh_token' | 'expires_at'>>()

  if (error || !data) throw new Error('Token Strava non trovato')

  const expiresMs = new Date(data.expires_at).getTime()
  const isExpired = Date.now() + REFRESH_BUFFER_MS >= expiresMs

  if (!isExpired) return data.access_token

  const newToken = await refreshToken(data.refresh_token)

  await supabase
    .from('strava_tokens')
    .update({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_at: new Date(newToken.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return newToken.access_token
}

export async function stravaFetch<T>(
  path: string,
  userId: string,
  supabase: SupabaseClient
): Promise<T> {
  const token = await getStravaToken(userId, supabase)
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.status} ${path}`)
  }

  return res.json()
}
