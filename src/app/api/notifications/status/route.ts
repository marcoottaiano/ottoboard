import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ subscribed: data !== null })
}
