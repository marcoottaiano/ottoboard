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

      if (updateError) throw updateError
      refreshedCount++
    } catch (err) {
      // Log failure — must pass user_id explicitly (no RLS session in service role context)
      await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: 'Strava Token Refresh: Re-authentication required — refresh token revoked',
        error_code: 'TOKEN_REVOKED',
      })
      errors.push(tokenRow.user_id)
    }
  }

  return NextResponse.json({ refreshed: refreshedCount, errors: errors.length })
}
