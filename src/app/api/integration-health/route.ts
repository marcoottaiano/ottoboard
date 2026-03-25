import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ strava: [] })
  }

  const { data, error } = await supabase
    .from('integration_error_logs')
    .select('id, service, error_message, error_code, occurred_at')
    .eq('user_id', user.id)
    .eq('service', 'strava')
    .order('occurred_at', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ strava: [] })
  }

  return NextResponse.json({ strava: data ?? [] })
}
