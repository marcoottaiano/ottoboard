import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { CREATE_ISSUE_MUTATION } from '@/lib/linear/queries'
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

interface CreateIssueData {
  issueCreate: {
    success: boolean
    issue: { id: string; identifier: string; url: string }
  }
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskId, title, description, priority, columnId } = await req.json()
  if (!taskId || !title) return NextResponse.json({ error: 'taskId e title richiesti' }, { status: 400 })

  // Get token
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

  // Get the task to find the project
  const { data: task } = await supabase.from('tasks').select('project_id').eq('id', taskId).single()
  if (!task) return NextResponse.json({ error: 'Task non trovata' }, { status: 404 })

  // Get the project to find linear_project_id
  const { data: project } = await supabase
    .from('projects')
    .select('linear_project_id')
    .eq('id', task.project_id)
    .single()

  // Get the column to find real stateId (virtual format: "projectId:stateId")
  let realStateId: string | undefined
  if (columnId) {
    const { data: column } = await supabase.from('columns').select('linear_state_id').eq('id', columnId).single()
    if (column?.linear_state_id) {
      realStateId = column.linear_state_id.split(':').pop()
    }
  }

  try {
    const result = await linearQuery<CreateIssueData>(apiKey, CREATE_ISSUE_MUTATION, {
      teamId: tokenRow.selected_team_id,
      title,
      description: description || undefined,
      priority: priorityToLinear(priority as Priority),
      stateId: realStateId,
      projectId: project?.linear_project_id || undefined,
    })

    if (!result.issueCreate.success) {
      return NextResponse.json({ error: 'Errore creazione issue in Linear' }, { status: 500 })
    }

    const issue = result.issueCreate.issue

    // Update the Supabase task with Linear IDs
    await supabase.from('tasks').update({
      linear_issue_id: issue.id,
      linear_issue_url: issue.url,
      linear_identifier: issue.identifier,
    }).eq('id', taskId)

    return NextResponse.json({ issue })
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }
}
