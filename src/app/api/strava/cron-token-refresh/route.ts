import { createAdminClient } from '@/lib/supabase/admin'
import { refreshStravaToken } from '@/lib/strava/client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Auth: same pattern as /api/notifications/cron
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Find all tokens expiring within the next 24 hours
  const { data: tokens, error } = await supabase
    .from('strava_tokens')
    .select('user_id, refresh_token, expires_at')
    .lt('expires_at', threshold)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ refreshed: 0 })
  }

  let refreshedCount = 0
  const errors: string[] = []

  for (const tokenRow of tokens) {
    let newToken: Awaited<ReturnType<typeof refreshStravaToken>> | null = null

    // P1/P2: separate refresh errors from DB update errors
    try {
      newToken = await refreshStravaToken(tokenRow.refresh_token)
    } catch (refreshErr) {
      // Only a 401/revoked refresh token should be TOKEN_REVOKED; all other errors are REFRESH_FAILED
      const msg = refreshErr instanceof Error ? refreshErr.message : String(refreshErr)
      const isRevoked = msg.includes('401') || msg.toLowerCase().includes('revoked') || msg.toLowerCase().includes('unauthorized')
      const { error: logErr } = await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: `Strava Token Refresh: ${isRevoked ? 'Re-authentication required — refresh token revoked' : `Errore temporaneo — ${msg}`}`,
        error_code: isRevoked ? 'TOKEN_REVOKED' : 'REFRESH_FAILED',
      })
      if (logErr) console.error('[cron-token-refresh] failed to log error for user', tokenRow.user_id, logErr.message)
      errors.push(tokenRow.user_id)
      continue
    }

    // P2: DB update failure is separate from token revocation
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
      const { error: logErr } = await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: `Strava Token Refresh: token rinnovato ma salvataggio fallito — ${updateError.message}`,
        error_code: 'DB_UPDATE_FAILED',
      })
      if (logErr) console.error('[cron-token-refresh] failed to log DB error for user', tokenRow.user_id, logErr.message)
      errors.push(tokenRow.user_id)
      continue
    }

    refreshedCount++
  }

  return NextResponse.json({ refreshed: refreshedCount, errors: errors.length })
}
