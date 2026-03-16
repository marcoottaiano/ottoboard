import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { CREATE_PROJECT_MUTATION } from '@/lib/linear/queries'
import { decryptApiKey } from '@/lib/linear/crypto'

interface CreateProjectData {
  projectCreate: {
    success: boolean
    project: { id: string; name: string; description: string | null; icon: string | null }
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome progetto richiesto' }, { status: 400 })

  const { data: tokenRow } = await supabase
    .from('linear_tokens')
    .select('api_key, selected_team_id')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow?.api_key || !tokenRow?.selected_team_id) {
    return NextResponse.json({ error: 'Linear non configurato' }, { status: 400 })
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(tokenRow.api_key)
  } catch {
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  try {
    const result = await linearQuery<CreateProjectData>(apiKey, CREATE_PROJECT_MUTATION, {
      teamId: tokenRow.selected_team_id,
      name: name.trim(),
      description: description?.trim() || undefined,
      icon: icon?.trim() || undefined,
    })

    if (!result.projectCreate.success) {
      return NextResponse.json({ error: 'Errore creazione progetto in Linear' }, { status: 500 })
    }

    return NextResponse.json({ project: result.projectCreate.project })
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }
}
