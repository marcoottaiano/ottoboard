import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAMS_QUERY } from '@/lib/linear/queries'
import { encryptApiKey } from '@/lib/linear/crypto'

interface TeamsData {
  teams: { nodes: Array<{ id: string; name: string; key: string }> }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey) {
    return NextResponse.json({ error: 'API key richiesta' }, { status: 400 })
  }

  // Validate key by fetching teams
  try {
    await linearQuery<TeamsData>(apiKey, TEAMS_QUERY)
  } catch {
    return NextResponse.json({ error: 'API key non valida o non autorizzata' }, { status: 400 })
  }

  let encryptedKey: string
  try {
    encryptedKey = encryptApiKey(apiKey)
  } catch {
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  const { error } = await supabase
    .from('linear_tokens')
    .upsert({ user_id: user.id, api_key: encryptedKey }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: 'Errore salvataggio integrazione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
