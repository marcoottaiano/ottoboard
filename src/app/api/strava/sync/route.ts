import { createClient } from '@/lib/supabase/server'
import { getActivitiesAfter } from '@/lib/strava/api'
import { stravaActivityToDb } from '@/lib/strava/transforms'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const scopeDays = searchParams.get('scope_days') // '30' | 'all' | null

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { data: tokenRow } = await supabase
    .from('strava_tokens')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Strava non connesso' }, { status: 400 })
  }

  let after: Date | undefined
  if (tokenRow.last_synced_at) {
    after = new Date(tokenRow.last_synced_at)
  } else if (scopeDays === '30') {
    after = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  }

  let stravaActivities: Awaited<ReturnType<typeof getActivitiesAfter>>
  try {
    stravaActivities = await getActivitiesAfter(user.id, supabase, after)
  } catch (err) {
    await supabase
      .from('integration_error_logs')
      .insert({
        service: 'strava',
        error_message: `Strava Sync: ${err instanceof Error ? err.message : 'Errore comunicazione API Strava'}`,
        error_code: '500',
      })
    return NextResponse.json({ error: 'Errore comunicazione con Strava' }, { status: 500 })
  }

  if (stravaActivities.length === 0) {
    await supabase
      .from('strava_tokens')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ synced: 0 })
  }

  const rows = stravaActivities.map((a) => stravaActivityToDb(a, user.id))

  const { error: upsertError } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'id' })

  if (upsertError) {
    await supabase
      .from('integration_error_logs')
      .insert({ service: 'strava', error_message: `Strava Sync: Errore salvataggio attività — ${upsertError.message}`, error_code: '500' })
    return NextResponse.json({ error: 'Errore salvataggio attività' }, { status: 500 })
  }

  await supabase
    .from('strava_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ synced: rows.length })
}
