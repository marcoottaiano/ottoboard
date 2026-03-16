import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAMS_QUERY } from '@/lib/linear/queries'
import { decryptApiKey } from '@/lib/linear/crypto'

interface TeamsData {
  teams: { nodes: Array<{ id: string; name: string }> }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const teamId = typeof body?.teamId === 'string' ? body.teamId.trim() : ''
  const teamName = typeof body?.teamName === 'string' ? body.teamName.trim() : ''

  if (!teamId || !teamName) {
    return NextResponse.json({ error: 'teamId e teamName sono obbligatori' }, { status: 400 })
  }

  // Fetch api_key and validate teamId against real Linear teams
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

  let teams: Array<{ id: string; name: string }>
  try {
    const result = await linearQuery<TeamsData>(apiKey, TEAMS_QUERY)
    teams = result.teams.nodes
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }

  const validTeam = teams.find((t) => t.id === teamId)
  if (!validTeam) {
    return NextResponse.json({ error: 'Team non trovato' }, { status: 400 })
  }

  const { error } = await supabase
    .from('linear_tokens')
    .update({ selected_team_id: validTeam.id, selected_team_name: validTeam.name })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
