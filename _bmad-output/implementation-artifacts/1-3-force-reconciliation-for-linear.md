# Story 1.3: Force Reconciliation for Linear

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.3
**Story Key:** `1-3-force-reconciliation-for-linear`
**Status:** ready-for-dev
**Created:** 2026-03-20

---

## User Story

As a user,
I want to trigger a "Force Reconciliation" from the Profile Integration Health section to fully re-sync Linear data,
So that I can resolve stale or mismatched data (including orphaned items) without waiting for the next webhook event.

---

## Acceptance Criteria

**Given** I am on the /profile Integration Health section for Linear and Linear is connected
**When** I click "Force Reconciliation"
**Then** the button shows a loading state and the system fetches all Projects, States, and Issues from the Linear API

**Given** the reconciliation fetch completes successfully
**When** the sync finishes
**Then** the local Supabase cache is updated (all fetched items upserted, orphaned items deleted) and a "Riconciliazione completata" toast is shown via `sonner`
**And** the SyncStatusBadge on the KanbanColumnWidget updates to "Live" (React Query invalidation)

**Given** the reconciliation fetch fails (e.g., invalid API key, Linear API unreachable)
**When** the error is returned
**Then** a human-readable error message is shown inline below the button in the Linear health card
**And** the local Supabase cache remains unchanged (no DB writes are attempted when the Linear API fetch fails)

---

## Context for the Dev Agent

### What This Story Does

Adds a **Force Reconciliation** capability to the `IntegrationHealthSection` for Linear. Specifically:

1. A new API route `/api/linear/reconcile` (POST) that does a **full re-sync** (not incremental):
   - Fetches ALL projects, states, and issues from Linear (paginated, complete)
   - Upserts everything fresh
   - **Deletes orphaned items** (tasks/columns/projects with `linear_*_id` that no longer exist in Linear) — this is the key difference from `/api/linear/sync`
   - Only writes to DB if the Linear API fetch succeeds completely

2. A new `forceReconcile` mutation added to `useLinearConnection` hook

3. A "Force Reconciliation" button + inline result display added to the **Linear** `ServiceHealthCard` inside `IntegrationHealthSection`

---

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `/api/linear/sync` route | `src/app/api/linear/sync/route.ts` | **Full implementation to COPY and adapt** — same Linear data fetch + upsert logic. The reconcile route is structurally identical but adds orphan deletion and is triggered differently. |
| `linearQuery()` | `src/lib/linear/client.ts` | GraphQL client for Linear — reuse as-is |
| `TEAM_DATA_QUERY` | `src/lib/linear/queries.ts` | GraphQL query for team data — reuse as-is |
| `linearIssueToTask()` | `src/lib/linear/transforms.ts` | Transforms Linear issue → task shape — reuse as-is |
| `decryptApiKey()` | `src/lib/linear/crypto.ts` | Decrypts stored API key — reuse as-is |
| `useLinearConnection()` | `src/hooks/useLinearConnection.ts` | Add `forceReconcile` mutation here — same file, same pattern as existing `syncMutation` |
| `IntegrationHealthSection` | `src/components/profile/IntegrationHealthSection.tsx` | Add button + inline result to `ServiceHealthCard` via new optional props |
| `supabase.from('integration_error_logs').insert(...)` | Already in sync routes | Same error logging pattern — use in reconcile route on failure |
| `toast.success` / `toast.error` via `sonner` | Already in `useLinearConnection.ts` | Same toast pattern for reconcile outcome |
| `queryClient.invalidateQueries(...)` | Already in sync mutation's `onSuccess` | Same invalidation keys for reconcile |

---

### What Must Be Created / Modified

| Action | File | Notes |
|---|---|---|
| **CREATE** | `src/app/api/linear/reconcile/route.ts` | New POST endpoint — full re-sync + orphan deletion |
| **MODIFY** | `src/hooks/useLinearConnection.ts` | Add `forceReconcile` mutation + expose via return object |
| **MODIFY** | `src/components/profile/IntegrationHealthSection.tsx` | Add button + inline result to Linear ServiceHealthCard |

No DB migration required. No new npm dependencies.

---

## Technical Implementation

### 1. New API Route `/api/linear/reconcile`

**File:** `src/app/api/linear/reconcile/route.ts`

This route is a **copy of `/api/linear/sync`** with two key differences:
1. After fetching all data successfully, it **deletes orphaned rows** before/after upserting
2. The fetch phase is wrapped so that if it fails, NO DB writes occur

**Complete implementation:**

```typescript
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
    await supabase
      .from('integration_error_logs')
      .insert({
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
    await supabase
      .from('integration_error_logs')
      .insert({
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
  while (pageInfo.hasNextPage && pageInfo.endCursor) {
    try {
      const nextPage = await linearQuery<TeamData>(apiKey, TEAM_DATA_QUERY, {
        teamId,
        after: pageInfo.endCursor,
      })
      issues.push(...nextPage.team.issues.nodes)
      pageInfo = nextPage.team.issues.pageInfo
    } catch {
      // Partial pagination failure — stop pagination but continue with what we have
      break
    }
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

  // ── PHASE 4: Update last_synced_at ──────────────────────────────────────────
  await supabase
    .from('linear_tokens')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({
    reconciled: {
      projects: syncedProjects,
      columns: syncedColumns,
      tasks: syncedTasks,
      orphansRemoved: orphanTaskIds.length + orphanColumnIds.length + orphanProjectIds.length,
    },
  })
}
```

> **Key atomicity guarantee:** The orphan detection and DB writes (Phases 2–4) only execute if Phase 1 (Linear API fetch) completes without throwing. If Linear returns 401, network failure, etc., the function returns early at the Phase 1 try/catch with a 500 — the DB is untouched.

---

### 2. Extend `useLinearConnection` with `forceReconcile`

**File:** `src/hooks/useLinearConnection.ts`

**Add** a new `forceReconcileMutation` following the exact same pattern as `syncMutation`:

```typescript
// Add this interface alongside SyncResult at the top of the file:
interface ReconcileResult {
  reconciled: { projects: number; columns: number; tasks: number; orphansRemoved: number }
}

// Add this mutation inside the useLinearConnection function body, after syncMutation:
const forceReconcileMutation = useMutation<ReconcileResult>({
  mutationFn: async () => {
    const res = await fetch('/api/linear/reconcile', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Errore riconciliazione')
    return data
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: STATUS_KEY })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.invalidateQueries({ queryKey: ['columns'] })
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['integration-health'] })
    queryClient.invalidateQueries({ queryKey: ['sync-status-linear'] })
    const { projects, tasks, orphansRemoved } = data.reconciled
    const orphanNote = orphansRemoved > 0 ? ` (${orphansRemoved} rimossi)` : ''
    toast.success(`Riconciliazione completata — ${projects} progetti, ${tasks} task${orphanNote}`)
  },
  onError: (err) => {
    toast.error(`Errore riconciliazione: ${err.message}`)
  },
})
```

**Add to the return object** (at the bottom of `useLinearConnection`):
```typescript
forceReconcile: forceReconcileMutation.mutate,
isReconciling: forceReconcileMutation.isPending,
reconcileError: forceReconcileMutation.error?.message ?? null,
reconcileResult: forceReconcileMutation.data ?? null,
```

> **Why extend `useLinearConnection` instead of a new hook?** The Linear mutation state (isSyncing, isReconciling, isConnecting) needs to be coordinated — exposing everything from one hook prevents the UI from triggering a reconcile while a sync is in progress. The component can check `isSyncing || isReconciling` to disable both buttons simultaneously.

---

### 3. Modify `IntegrationHealthSection` — Add Force Reconciliation Button

**File:** `src/components/profile/IntegrationHealthSection.tsx`

**Pattern:** Add optional action props to `ServiceHealthCard`, then pass the reconciliation control only to the Linear card.

#### 3a. Extend `ServiceHealthCard` props

```typescript
// Add to ServiceHealthCard props interface:
onReconcile?: () => void
isReconciling?: boolean
reconcileError?: string | null
reconcileResult?: { reconciled: { projects: number; tasks: number; orphansRemoved: number } } | null
```

#### 3b. Add reconciliation UI inside `ServiceHealthCard`

Add this block **after the error logs section** (before the closing `</div>` of the card), rendered only when `onReconcile` is provided:

```tsx
{/* Force Reconciliation — only for Linear */}
{onReconcile && (
  <div className="pt-2 border-t border-white/[0.05] space-y-2">
    <button
      onClick={onReconcile}
      disabled={isReconciling}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors text-xs font-medium border border-purple-500/20"
    >
      <RefreshCw size={12} className={isReconciling ? 'animate-spin' : ''} />
      {isReconciling ? 'Riconciliazione...' : 'Force Reconciliation'}
    </button>

    {/* Inline error message */}
    {reconcileError && !isReconciling && (
      <p className="text-xs text-red-400/80 leading-snug">{reconcileError}</p>
    )}

    {/* Inline success message */}
    {reconcileResult && !isReconciling && !reconcileError && (
      <p className="text-xs text-emerald-400/80">
        ✓ {reconcileResult.reconciled.projects} progetti, {reconcileResult.reconciled.tasks} task
        {reconcileResult.reconciled.orphansRemoved > 0
          ? ` · ${reconcileResult.reconciled.orphansRemoved} rimossi`
          : ''}
      </p>
    )}
  </div>
)}
```

> **Import needed:** Add `RefreshCw` to the existing Lucide import at the top of the file.

#### 3c. Update `IntegrationHealthSection` to consume `useLinearConnection`

```typescript
// Add to imports at top of the file:
import { useLinearConnection } from '@/hooks/useLinearConnection'

// Inside IntegrationHealthSection(), add:
const {
  forceReconcile,
  isReconciling,
  reconcileError,
  reconcileResult,
} = useLinearConnection()
```

> **Deduplication note:** `useLinearConnection()` is likely already mounted via `LinearIntegrationCard` on the same page. React Query deduplicates `['linear-status']` fetches automatically. No double network call.

#### 3d. Pass props only to the Linear `ServiceHealthCard`

```tsx
// Linear card — add the new props:
<ServiceHealthCard
  name="Linear"
  icon={<Link2 size={16} />}
  color="purple"
  isConnected={linearConnected}
  isLoading={linearLoading}
  lastSyncedAt={linearLastSync}
  errorLogs={health?.linear ?? []}
  logsLoading={logsLoading}
  onReconcile={linearConnected ? forceReconcile : undefined}
  isReconciling={isReconciling}
  reconcileError={reconcileError}
  reconcileResult={reconcileResult}
/>

// Strava card — no reconcile props (Force Reconciliation is Linear-only in this story)
<ServiceHealthCard
  name="Strava"
  {/* ... existing props unchanged ... */}
/>
```

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **Fail before DB touch** | If Linear API fetch throws (Phase 1), return early. Phase 2+ only runs on successful fetch. |
| **Upsert not update for existing rows** | Projects/columns/tasks use `upsert(..., { onConflict: 'linear_*_id' })` — same pattern as sync route. |
| **Delete orphans AFTER upserts** | Delete in order: tasks → columns → projects (FK cascade order). Do NOT delete first — that risks empty cache if upserts fail. |
| **No toast from component** | Toast is fired from `forceReconcileMutation.onSuccess/onError` in the hook — not from the component. The component shows inline result from `reconcileResult` / `reconcileError`. |
| **Invalidate `integration-health`** | After successful reconcile, invalidate `['integration-health']` to refresh error logs count in the health card badge. |
| **Invalidate `sync-status-linear`** | Invalidate so `SyncStatusBadge` on `KanbanColumnWidget` refreshes to "Live" immediately. |
| **Button disabled when not connected** | Pass `onReconcile={linearConnected ? forceReconcile : undefined}` — button only appears when Linear is connected. |
| **No `overflow-hidden` on card** | Card containers must never have `overflow-hidden` — the button is fully visible, no dropdown concern. |
| **TypeScript strict** | `reconcileResult` is `ReconcileResult | null` — use optional chaining when accessing `.reconciled.*`. |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| Touching DB before Linear fetch completes | Phase 1 fetch runs entirely in a try/catch → return early on error, no DB side effects |
| Creating a standalone `useForceReconciliation` hook | Add `forceReconcile` mutation to existing `useLinearConnection` — keeps Linear state co-located |
| Adding force reconciliation to `LinearIntegrationCard` | Button lives in `IntegrationHealthSection` (per epic: "from the Profile Integration Health section") |
| Deleting all rows first, then re-inserting | Upsert first, then delete orphans — safe order prevents empty-cache window |
| Using `supabase.admin` in the reconcile route | Use `createClient()` from `@/lib/supabase/server` — RLS applies via authenticated session |
| Blocking UI during reconcile | Button shows loading state, rest of page stays interactive |
| Showing toast AND inline result | Toast (`sonner`) confirms globally; inline result in card shows counts. Both are intentional — do NOT remove the toast. |
| Using `upsert` for `integration_error_logs` | Always `insert()` for error logs — append-only pattern established in story 1.2 |

---

## Learnings from Stories 1.1 and 1.2

- **React Query deduplication:** `useLinearConnection()` called from `IntegrationHealthSection` and `LinearIntegrationCard` simultaneously fires only ONE network request for `['linear-status']`. No concern.
- **`shrink-0` on icon elements:** Apply to the `RefreshCw` icon in the button to prevent flex truncation.
- **Mutation `isPending` not `isLoading`:** TanStack Query v5 uses `isPending` for mutations (not `isLoading`). The existing `syncMutation.isPending` in `useLinearConnection` confirms this.
- **`toast.success()` from `sonner`** is already imported in `useLinearConnection` — no new import needed for the reconcile mutation.
- **`error_code` field is optional** in `integration_error_logs` — passing `'500'` as string is correct, but it can also be `null`.
- **Never use `toISOString().slice(0,10)` for display** — use `toLocaleString('it-IT', ...)` as established in `formatTimestamp` inside `IntegrationHealthSection`.

---

## File Change Summary

| Action | File |
|---|---|
| **CREATE** | `src/app/api/linear/reconcile/route.ts` |
| **MODIFY** | `src/hooks/useLinearConnection.ts` (add `forceReconcileMutation`, expose `forceReconcile`, `isReconciling`, `reconcileError`, `reconcileResult`) |
| **MODIFY** | `src/components/profile/IntegrationHealthSection.tsx` (extend `ServiceHealthCard` props, add button + inline states, consume `useLinearConnection` for reconcile) |

No new DB migration. No new npm dependencies. No Edge Function changes.

---

## Definition of Done

- [ ] `POST /api/linear/reconcile` returns 500 with `{ error: "..." }` and logs to `integration_error_logs` when Linear API key is invalid or API unreachable — DB is NOT modified
- [ ] `POST /api/linear/reconcile` returns `{ reconciled: { projects, columns, tasks, orphansRemoved } }` on success
- [ ] Orphaned tasks (linear_issue_id not in fresh fetch) are deleted from DB
- [ ] Orphaned columns (virtual linear_state_id not in fresh fetch) are deleted from DB
- [ ] Orphaned projects (linear_project_id not in fresh fetch) are deleted from DB
- [ ] "Force Reconciliation" button appears in the Linear `ServiceHealthCard` inside `IntegrationHealthSection` when Linear is connected
- [ ] Button is hidden (not rendered) when Linear is not connected
- [ ] Button shows spinning `RefreshCw` icon and "Riconciliazione..." label during the request
- [ ] `toast.success("Riconciliazione completata — X progetti, Y task")` fires on success
- [ ] Inline error message appears below the button on failure (red text, no modal)
- [ ] Inline success summary (counts) appears below the button after success
- [ ] `SyncStatusBadge` on `KanbanColumnWidget` updates to "Live" after successful reconcile (via `['sync-status-linear']` invalidation)
- [ ] `['integration-health']` is invalidated on success (health badge refreshes)
- [ ] No TypeScript errors (`strict: true`, `npx tsc --noEmit` clean)
- [ ] Strava `ServiceHealthCard` is unchanged — no reconcile button, no new props

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
