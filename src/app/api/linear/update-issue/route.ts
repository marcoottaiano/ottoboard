import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { UPDATE_ISSUE_MUTATION } from '@/lib/linear/queries'
import { decryptApiKey } from '@/lib/linear/crypto'

type Priority = 'urgent' | 'high' | 'medium' | 'low' | null

function priorityToLinear(p: Priority): number {
  switch (p) {
    case 'urgent': return 1
    case 'high': return 2
    case 'medium': return 3
    case 'low': return 4
    default: return 0
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { issueId, stateId, title, description, priority } = body

  if (!issueId) return NextResponse.json({ error: 'issueId richiesto' }, { status: 400 })

  const { data: tokenRow } = await supabase
    .from('linear_tokens')
    .select('api_key')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow?.api_key) return NextResponse.json({ error: 'Linear non connesso' }, { status: 400 })

  let apiKey: string
  try {
    apiKey = decryptApiKey(tokenRow.api_key)
  } catch {
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  // Build input object with only provided fields
  const input: Record<string, unknown> = {}
  if (stateId !== undefined) input.stateId = stateId
  if (title !== undefined) input.title = title
  if (description !== undefined) input.description = description ?? ''
  if (priority !== undefined) input.priority = priorityToLinear(priority as Priority)

  try {
    await linearQuery(apiKey, UPDATE_ISSUE_MUTATION, { issueId, ...input })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }
}
