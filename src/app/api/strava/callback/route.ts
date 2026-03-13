import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/fitness?error=strava_auth_denied`)
  }

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/fitness?error=strava_not_configured`)
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/fitness?error=strava_token_exchange`)
  }

  const tokenData = await tokenRes.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const expiresAt = new Date(tokenData.expires_at * 1000).toISOString()

  const { error: upsertError } = await supabase.from('strava_tokens').upsert({
    user_id: user.id,
    athlete_id: tokenData.athlete.id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    scope: tokenData.scope,
    updated_at: new Date().toISOString(),
  })

  if (upsertError) {
    return NextResponse.redirect(`${origin}/fitness?error=strava_save_failed`)
  }

  // Trigger sync iniziale in background (non bloccante)
  fetch(`${origin}/api/strava/sync`, {
    method: 'POST',
    headers: { Cookie: request.headers.get('cookie') ?? '' },
  }).catch(() => {})

  return NextResponse.redirect(`${origin}/fitness`)
}
