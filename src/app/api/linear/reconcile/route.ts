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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tokenRow } = await supabase
    .from('linear_tokens')
    .select('api_key, selected_team_id')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow?.api_key || !tokenRow?.selected_team_id) {
    return NextResponse.json(
      { error: 'Linear non configurato o team non selezionato' },
      { status: 400 }
    )
  }

  let apiKey: string
  try {
    apiKey = decryptApiKey(tokenRow.api_key)
  } catch {
    await supabase.from('integration_error_logs').insert({
      service: 'linear',
      error_message: 'Force Reconciliation: Errore decrittazione API key',
      error_code: '500',
    })
    return NextResponse.json({ error: 'Errore di configurazione server' }, { status: 500 })
  }

  const teamId = tokenRow.selected_team_id

  // ── PHASE 1: Fetch ALL data from Linear ───────────────────────────────────
  // If ANY fetch fails here, we return early WITHOUT touching the DB.
  let firstPage: TeamData
  try {
    firstPage = await linearQuery<TeamData>(apiKey, TEAM_DATA_QUERY, { teamId, after: null })
  } catch {
    await supabase.from('integration_error_logs').insert({
      service: 'linear',
      error_message: 'Force Reconciliation: Errore comunicazione con API Linear',
      error_code: '500',
    })
    return NextResponse.json(
      { error: 'Errore nella comunicazione con Linear. Cache locale invariata.' },
      { status: 500 }
    )
  }

  const team = firstPage.team
  const states = team.states.nodes
  const linearProjects = team.projects.nodes
  const issues: LinearIssue[] = [...team.issues.nodes]

  // Paginate all remaining issues
  let pageInfo = team.issues.pageInfo
  let paginationFailed = false
  while (pageInfo.hasNextPage && pageInfo.endCursor) {
    try {
      const nextPage = await linearQuery<TeamData>(apiKey, TEAM_DATA_QUERY, {
        teamId,
        after: pageInfo.endCursor,
      })
      issues.push(...nextPage.team.issues.nodes)
      pageInfo = nextPage.team.issues.pageInfo
    } catch {
      paginationFailed = true
      break
    }
  }

  // P1 fix: if pagination failed we have incomplete data — abort without touching the DB
  if (paginationFailed) {
    await supabase.from('integration_error_logs').insert({
      service: 'linear',
      error_message:
        'Force Reconciliation: Errore paginazione issues Linear. Cache locale invariata.',
      error_code: '500',
    })
    return NextResponse.json(
      { error: 'Errore nel recupero di tutte le issue da Linear. Cache locale invariata.' },
      { status: 500 }
    )
  }

  // Collect Linear IDs for orphan detection
  const fetchedProjectIds = new Set(linearProjects.map((p) => p.id))
  const fetchedIssueIds = new Set(issues.map((i) => i.id))
  // Virtual state IDs are scoped per project: `${projectId}:${stateId}`
  const fetchedVirtualStateIds = new Set(
    linearProjects.flatMap((p) => states.map((s) => `${p.id}:${s.id}`))
  )

  // ── PHASE 2: Upsert fresh data ─────────────────────────────────────────────
  let syncedProjects = 0
  let syncedColumns = 0
  let syncedTasks = 0

  const assignedIssueIds = new Set<string>()
  type ProjectEntry = { projectId: string; stateToColumnId: Map<string, string> }
  const projectEntries: ProjectEntry[] = []

  for (const lp of linearProjects) {
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

    const stateToColumnId = new Map<string, string>()

    for (const ls of states) {
      const virtualStateId = `${lp.id}:${ls.id}`
      const { data: upsertedCol } = await supabase
        .from('columns')
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            name: ls.name,
            position: ls.position,
            color: ls.color,
            linear_state_id: virtualStateId,
            linear_state_color: ls.color,
          },
          { onConflict: 'linear_state_id' }
        )
        .select('id')
        .single()

      if (!upsertedCol) continue
      stateToColumnId.set(ls.id, upsertedCol.id)
      syncedColumns++
    }

    // Upsert issues explicitly assigned to this project
    const projectIssues = issues.filter((i) => i.project?.id === lp.id)
    for (const li of projectIssues) {
      const columnId = stateToColumnId.get(li.state.id)
      if (!columnId) continue
      const taskData = { ...linearIssueToTask(li, columnId, projectId), user_id: user.id }
      await supabase.from('tasks').upsert(taskData, { onConflict: 'linear_issue_id' })
      assignedIssueIds.add(li.id)
      syncedTasks++
    }

    projectEntries.push({ projectId, stateToColumnId })
  }

  // Unassigned issues (Linear API quirk: project shown in UI but null in GraphQL)
  const unassignedIssues = issues.filter((i) => !i.project && !assignedIssueIds.has(i.id))
  const fallbackEntry = projectEntries[0]
  if (fallbackEntry && unassignedIssues.length > 0) {
    for (const li of unassignedIssues) {
      const columnId = fallbackEntry.stateToColumnId.get(li.state.id)
      if (!columnId) continue
      const taskData = {
        ...linearIssueToTask(li, columnId, fallbackEntry.projectId),
        user_id: user.id,
      }
      await supabase.from('tasks').upsert(taskData, { onConflict: 'linear_issue_id' })
      syncedTasks++
    }
  }

  // ── PHASE 3: Delete orphaned items ─────────────────────────────────────────
  // Items that were in the local cache but no longer exist in Linear.
  // Fetch existing linear IDs from DB, then delete those not in the fetched sets.

  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id, linear_issue_id')
    .eq('user_id', user.id)
    .not('linear_issue_id', 'is', null)

  const orphanTaskIds = (existingTasks ?? [])
    .filter((t) => t.linear_issue_id && !fetchedIssueIds.has(t.linear_issue_id))
    .map((t) => t.id)

  if (orphanTaskIds.length > 0) {
    await supabase.from('tasks').delete().in('id', orphanTaskIds).eq('user_id', user.id)
  }

  const { data: existingColumns } = await supabase
    .from('columns')
    .select('id, linear_state_id')
    .eq('user_id', user.id)
    .not('linear_state_id', 'is', null)

  const orphanColumnIds = (existingColumns ?? [])
    .filter((c) => c.linear_state_id && !fetchedVirtualStateIds.has(c.linear_state_id))
    .map((c) => c.id)

  if (orphanColumnIds.length > 0) {
    await supabase.from('columns').delete().in('id', orphanColumnIds).eq('user_id', user.id)
  }

  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id, linear_project_id')
    .eq('user_id', user.id)
    .not('linear_project_id', 'is', null)

  const orphanProjectIds = (existingProjects ?? [])
    .filter((p) => p.linear_project_id && !fetchedProjectIds.has(p.linear_project_id))
    .map((p) => p.id)

  if (orphanProjectIds.length > 0) {
    await supabase.from('projects').delete().in('id', orphanProjectIds).eq('user_id', user.id)
  }

  // ── PHASE 4: Update last_synced_at (only if something was actually synced) ──
  if (syncedProjects > 0) {
    await supabase
      .from('linear_tokens')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    reconciled: {
      projects: syncedProjects,
      columns: syncedColumns,
      tasks: syncedTasks,
      orphansRemoved: orphanTaskIds.length + orphanColumnIds.length + orphanProjectIds.length,
    },
  })
}
