import { createAdminClient } from '@/lib/supabase/admin'
import { refreshStravaToken } from '@/lib/strava/client'
import { getActivitiesAfter } from '@/lib/strava/api'
import { stravaActivityToDb } from '@/lib/strava/transforms'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: allTokens, error } = await supabase
    .from('strava_tokens')
    .select('user_id, refresh_token, expires_at, last_synced_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!allTokens || allTokens.length === 0) {
    return NextResponse.json({ refreshed: 0, synced: 0 })
  }

  // --- Phase 1: refresh tokens expiring within 24h ---
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  let refreshedCount = 0
  const refreshErrors: string[] = []

  for (const tokenRow of allTokens.filter((t) => t.expires_at < threshold)) {
    try {
      const newToken = await refreshStravaToken(tokenRow.refresh_token)

      const { error: updateError } = await supabase
        .from('strava_tokens')
        .update({
          access_token: newToken.access_token,
          refresh_token: newToken.refresh_token,
          expires_at: new Date(newToken.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', tokenRow.user_id)

      if (updateError) {
        await supabase.from('integration_error_logs').insert({
          user_id: tokenRow.user_id,
          service: 'strava',
          error_message: `Strava Token Refresh: token rinnovato ma salvataggio fallito — ${updateError.message}`,
          error_code: 'DB_UPDATE_FAILED',
        })
        refreshErrors.push(tokenRow.user_id)
        continue
      }

      refreshedCount++
    } catch (refreshErr) {
      const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr)
      const isRevoked =
        msg.includes('401') ||
        msg.toLowerCase().includes('revoked') ||
        msg.toLowerCase().includes('unauthorized')

      await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: `Strava Token Refresh: ${isRevoked ? 'Re-authentication required — refresh token revoked' : `Errore temporaneo — ${msg}`}`,
        error_code: isRevoked ? 'TOKEN_REVOKED' : 'REFRESH_FAILED',
      })
      refreshErrors.push(tokenRow.user_id)
    }
  }

  // --- Phase 2: sync activities for all users ---
  // Users that failed to refresh are skipped (their token may be invalid)
  const usersToSync = allTokens.filter((t) => !refreshErrors.includes(t.user_id))
  let syncedTotal = 0
  const syncErrors: string[] = []

  for (const tokenRow of usersToSync) {
    try {
      // 48h buffer to catch activities uploaded with a past start_date
      const after = tokenRow.last_synced_at
        ? new Date(new Date(tokenRow.last_synced_at).getTime() - 48 * 60 * 60 * 1000)
        : undefined

      const activities = await getActivitiesAfter(tokenRow.user_id, supabase, after)

      if (activities.length > 0) {
        const rows = activities.map((a) => stravaActivityToDb(a, tokenRow.user_id))
        const { error: upsertError } = await supabase
          .from('activities')
          .upsert(rows, { onConflict: 'id' })

        if (upsertError) {
          await supabase.from('integration_error_logs').insert({
            user_id: tokenRow.user_id,
            service: 'strava',
            error_message: `Strava Cron Sync: errore salvataggio attività — ${upsertError.message}`,
            error_code: 'SYNC_DB_FAILED',
          })
          syncErrors.push(tokenRow.user_id)
          continue
        }

        syncedTotal += activities.length
      }

      await supabase
        .from('strava_tokens')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', tokenRow.user_id)
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr)
      await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: `Strava Cron Sync: ${msg}`,
        error_code: 'SYNC_FAILED',
      })
      syncErrors.push(tokenRow.user_id)
    }
  }

  return NextResponse.json({
    refreshed: refreshedCount,
    synced: syncedTotal,
    errors: refreshErrors.length + syncErrors.length,
  })
}
