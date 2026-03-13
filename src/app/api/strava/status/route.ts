import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ connected: false })
  }

  const { data } = await supabase
    .from('strava_tokens')
    .select('athlete_id, last_synced_at, expires_at')
    .eq('user_id', user.id)
    .single()

  if (!data) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    athleteId: data.athlete_id,
    lastSyncedAt: data.last_synced_at,
    expiresAt: data.expires_at,
  })
}
