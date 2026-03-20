import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ linear: [], strava: [] })
  }

  const { data, error } = await supabase
    .from('integration_error_logs')
    .select('id, service, error_message, error_code, occurred_at')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ linear: [], strava: [] })
  }

  const linear = (data ?? []).filter((e) => e.service === 'linear').slice(0, 5)
  const strava = (data ?? []).filter((e) => e.service === 'strava').slice(0, 5)

  return NextResponse.json({ linear, strava })
}
