import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAM_DATA_QUERY } from '@/lib/linear/queries'
import { linearIssueToTask } from '@/lib/linear/transforms'
import { decryptApiKey } from '@/lib/linear/crypto'
import type { LinearState, LinearIssue, LinearProject } from '@/lib/linear/types'

interface TeamData {
  team: {
    id: string
    name: string
    key: string
    states: { nodes: LinearState[] }
    projects: { nodes: LinearProject[] }
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: LinearIssue[]
    }
  }
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tokenRow } = await supabase
    .from('linear_tokens')
    .select('api_key, selected_team_id, selected_team_name')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow?.api_key || !tokenRow?.selected_team_id) {
    return NextResponse.json({ error: 'Linear non configurato o team non selezionato' }, { status: 400 })
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(tokenRow.api_key)
  } catch {
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  const teamId = tokenRow.selected_team_id

  // Fetch team data (first page)
  let firstPage: TeamData
  try {
    firstPage = await linearQuery<TeamData>(apiKey, TEAM_DATA_QUERY, { teamId, after: null })
  } catch {
    return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
  }

  const team = firstPage.team
  const states = team.states.nodes
  const linearProjects = team.projects.nodes
  const issues: LinearIssue[] = [...team.issues.nodes]

  // Paginate remaining issues
  let pageInfo = team.issues.pageInfo
  while (pageInfo.hasNextPage && pageInfo.endCursor) {
    try {
      const nextPage = await linearQuery<TeamData>(apiKey, TEAM_DATA_QUERY, { teamId, after: pageInfo.endCursor })
      issues.push(...nextPage.team.issues.nodes)
      pageInfo = nextPage.team.issues.pageInfo
    } catch {
      break
    }
  }

  let syncedProjects = 0
  let syncedColumns = 0
  let syncedTasks = 0

  for (const lp of linearProjects) {
    // Upsert one Ottoboard project per Linear project
    const { data: upsertedProject } = await supabase
      .from('projects')
      .upsert(
        {
          user_id: user.id,
          name: lp.name,
          description: lp.description ?? null,
          color: lp.color ?? '#7c3aed',
          icon: lp.icon ?? null,
          status: 'active',
          linear_project_id: lp.id,
          linear_team_id: team.id,
        },
        { onConflict: 'linear_project_id' }
      )
      .select('id')
      .single()

    if (!upsertedProject) continue
    const projectId = upsertedProject.id
    syncedProjects++

    // Upsert columns from team states, using a virtual state ID scoped to this project
    // This avoids needing a composite unique constraint on (project_id, linear_state_id)
    const stateToColumnId = new Map<string, string>()

    for (const ls of states) {
      const virtualStateId = `${lp.id}:${ls.id}`
      const colData = {
        project_id: projectId,
        user_id: user.id,
        name: ls.name,
        position: ls.position,
        color: ls.color,
        linear_state_id: virtualStateId,
        linear_state_color: ls.color,
      }
      const { data: upsertedCol } = await supabase
        .from('columns')
        .upsert(colData, { onConflict: 'linear_state_id' })
        .select('id')
        .single()

      if (!upsertedCol) continue
      stateToColumnId.set(ls.id, upsertedCol.id)
      syncedColumns++
    }

    // Upsert issues belonging to this Linear project
    const projectIssues = issues.filter((i) => i.project?.id === lp.id)

    for (const li of projectIssues) {
      const columnId = stateToColumnId.get(li.state.id)
      if (!columnId) continue

      const taskData = { ...linearIssueToTask(li, columnId, projectId), user_id: user.id }
      await supabase
        .from('tasks')
        .upsert(taskData, { onConflict: 'linear_issue_id' })
      syncedTasks++
    }
  }

  // Update last_synced_at
  await supabase
    .from('linear_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({
    synced: { projects: syncedProjects, columns: syncedColumns, tasks: syncedTasks },
  })
}
