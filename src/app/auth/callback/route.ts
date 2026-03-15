import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const type = searchParams.get('type')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Password recovery → reset password page
      if (type === 'recovery' || next === '/auth/reset-password') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // Email confirmation after signup → onboarding
      if (type === 'signup' || type === 'email') {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
      // Default or explicit next
      return NextResponse.redirect(`${origin}${next ?? '/'}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
