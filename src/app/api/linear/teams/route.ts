import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAMS_QUERY } from '@/lib/linear/queries'
import { decryptApiKey } from '@/lib/linear/crypto'
import type { LinearTeam } from '@/lib/linear/types'

interface TeamsData {
  teams: { nodes: LinearTeam[] }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tokenRow } = await supabase
    .from('linear_tokens')
    .select('api_key')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow?.api_key) {
    return NextResponse.json({ error: 'Linear non connesso' }, { status: 400 })
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(tokenRow.api_key)
  } catch {
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  try {
    const result = await linearQuery<TeamsData>(apiKey, TEAMS_QUERY)
    return NextResponse.json({ teams: result.teams.nodes })
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }
}
