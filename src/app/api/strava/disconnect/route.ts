import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const { error } = await supabase
    .from('strava_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Errore disconnessione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
