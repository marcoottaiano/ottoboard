import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAMS_QUERY } from '@/lib/linear/queries'

interface TeamsData {
  teams: { nodes: Array<{ id: string }> }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')?.trim() ?? ''

  if (!key) {
    return NextResponse.json({ error: 'key richiesta' }, { status: 400 })
  }

  // Auth guard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await linearQuery<TeamsData>(key, TEAMS_QUERY)
    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('Linear validate error:', err)
    return NextResponse.json({ error: 'Chiave non valida' }, { status: 400 })
  }
}
