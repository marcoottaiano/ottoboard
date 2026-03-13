import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!clientId || !appUrl) {
    return NextResponse.json({ error: 'Strava non configurato' }, { status: 500 })
  }

  const redirectUri = `${appUrl}/api/strava/callback`
  const scope = 'activity:read_all'

  const stravaUrl = new URL('https://www.strava.com/oauth/authorize')
  stravaUrl.searchParams.set('client_id', clientId)
  stravaUrl.searchParams.set('redirect_uri', redirectUri)
  stravaUrl.searchParams.set('response_type', 'code')
  stravaUrl.searchParams.set('scope', scope)

  return NextResponse.redirect(stravaUrl.toString())
}
