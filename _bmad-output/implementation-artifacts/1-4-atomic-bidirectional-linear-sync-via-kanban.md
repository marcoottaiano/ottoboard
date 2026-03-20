# Story 1.4: Atomic Bidirectional Linear Sync via Kanban

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.4
**Story Key:** `1-4-atomic-bidirectional-linear-sync-via-kanban`
**Status:** ready-for-dev
**Created:** 2026-03-20

---

## User Story

As a user,
I want to drag a Linear issue to a new column in the Kanban board and have the state change persisted to Linear,
So that Ottoboard and Linear always reflect the same task state.

---

## Acceptance Criteria

**Given** I drag a task card from one column to another on the Kanban board
**When** the drop completes
**Then** the UI updates optimistically (task appears in new column immediately, no loading state visible)
**And** a PATCH request is sent to the Linear API to update the issue state in the background

**Given** the Linear API PATCH request fails
**When** the error is returned
**Then** the task card rolls back to its original column automatically
**And** a toast message "Operazione non riuscita, riprova" is shown to the user
**And** the local Supabase cache is NOT updated

**Given** a Linear webhook event arrives (issueUpdated)
**When** the Next.js API route processes the webhook
**Then** the local Supabase cache is updated atomically for the affected issue
**And** React Query is invalidated via Supabase Realtime to refresh the Kanban UI without page reload

---

## Context for the Dev Agent

### What This Story Does

**Part A — Fix DnD atomicity:** The current Kanban DnD (`KanbanBoard.tsx`) sends the Supabase update first and the Linear update as fire-and-forget (errors swallowed). Story 1.4 inverts this: Linear is updated first, and Supabase is only updated if Linear succeeds. On Linear failure: rollback optimistic cache + toast.

**Part B — Webhook receiver:** Create a Next.js API route `/api/linear/webhook` that receives `issueUpdated` push events from Linear, updates the Supabase `tasks` table atomically, and triggers UI refresh via Supabase Realtime.

**Part C — Supabase Realtime subscription:** Add a `useEffect` in `useTasks.ts` that subscribes to `postgres_changes` on the `tasks` table, calling `queryClient.invalidateQueries` on every remote change. This enables Part B to refresh the UI without a page reload.

---

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `handleDragEnd` | `src/components/projects/KanbanBoard.tsx:116` | Full DnD logic — MODIFY only the task-move branch, not column reorder |
| `tasksSnapshot.current` | `KanbanBoard.tsx:59` | Snapshot taken in `handleDragStart` — already used for rollback, reuse as-is |
| `updateLinearIssue` | `src/hooks/useLinearIssueUpdate.ts` | Existing mutation calling `/api/linear/update-issue` — change to `mutateAsync` at call site |
| `moveTask.mutateAsync` | `src/hooks/useTaskMutations.ts:87` | Supabase update for task column/position — move AFTER Linear succeeds |
| `UPDATE_ISSUE_STATE_MUTATION` | `src/lib/linear/queries.ts:67` | GraphQL for state-only update — prefer over full `UPDATE_ISSUE_MUTATION` for DnD (state only) |
| `/api/linear/update-issue/route.ts` | existing | Already handles `stateId` field — reuse for webhook-side calls OR call Linear GraphQL directly |
| `linearQuery()` | `src/lib/linear/client.ts` | GraphQL client — reuse in webhook handler |
| `decryptApiKey()` | `src/lib/linear/crypto.ts` | Decrypts stored API key — reuse in webhook handler |
| `linearIssueToTask()` | `src/lib/linear/transforms.ts` | Transform Linear issue → task shape — reuse in webhook handler |
| `createClient()` from server | `@/lib/supabase/server` | Supabase server client — use in webhook route |
| `toast.error()` via `sonner` | used in `useLinearConnection.ts` | Pattern for error toasts — replicate in `KanbanBoard.tsx` |
| `isLinearProject` flag | `KanbanBoard.tsx:45` | Already computed: `projects.find(p => p.id === projectId)?.linear_project_id != null` |

---

### What Must Be Created / Modified

| Action | File | Notes |
|---|---|---|
| **MODIFY** | `src/components/projects/KanbanBoard.tsx` | Fix DnD task-move to: Linear first → Supabase on success → rollback + toast on failure |
| **MODIFY** | `src/hooks/useLinearIssueUpdate.ts` | Remove `onError: () => {}` so errors propagate via `mutateAsync` |
| **MODIFY** | `src/hooks/useTasks.ts` | Add Supabase Realtime subscription for `tasks` table → invalidate React Query on change |
| **CREATE** | `src/app/api/linear/webhook/route.ts` | POST handler: verify Linear signature → process `issueUpdated` → update Supabase |
| **CREATE** | `supabase/migrations/20260320000001_realtime_tasks.sql` | Enable Postgres replication for `tasks` table |

No new npm dependencies required. No Edge Functions needed (Next.js API route covers the webhook).

---

## Technical Implementation

### 1. Fix DnD — `KanbanBoard.tsx`

#### Current (broken) flow in `handleDragEnd` task-move branch (line ~180):
```typescript
// CURRENT (wrong order for Linear):
await moveTask.mutateAsync(...)           // Supabase first
updateLinearIssue.mutate(...)             // Linear fire-and-forget, onError: () => {}
```

#### New flow — REPLACE the task-move `try/catch` block entirely:

```typescript
// Add import at top of KanbanBoard.tsx:
import { toast } from 'sonner'

// Inside handleDragEnd, after computing targetColumnId and newPosition:
// (keep the final optimistic update of queryClient as-is)

const movedTask = currentTasks.find((t) => t.id === active.id)
const targetCol = columns.find((c) => c.id === targetColumnId)

if (isLinearProject && movedTask?.linear_issue_id && targetCol?.linear_state_id) {
  // Linear project: Linear update must succeed before writing to Supabase
  const realStateId = targetCol.linear_state_id.split(':').pop() ?? targetCol.linear_state_id
  try {
    await updateLinearIssue.mutateAsync({
      issueId: movedTask.linear_issue_id,
      stateId: realStateId,
    })
    // Linear succeeded → persist locally
    await moveTask.mutateAsync({
      id: active.id as string,
      project_id: projectId,
      column_id: targetColumnId,
      position: newPosition,
    })
  } catch {
    // Rollback optimistic update
    if (tasksSnapshot.current) {
      queryClient.setQueryData(['tasks', projectId], tasksSnapshot.current)
    }
    toast.error('Operazione non riuscita, riprova')
  }
} else {
  // Non-Linear project: Supabase-only flow (unchanged)
  try {
    await moveTask.mutateAsync({
      id: active.id as string,
      project_id: projectId,
      column_id: targetColumnId,
      position: newPosition,
    })
  } catch {
    if (tasksSnapshot.current) {
      queryClient.setQueryData(['tasks', projectId], tasksSnapshot.current)
    }
  }
}
```

> **Key invariant:** For Linear projects, Supabase state is NEVER updated unless Linear API confirms success. The rollback restores the pre-drag snapshot (captured in `handleDragStart` via `tasksSnapshot.current`).

---

### 2. Fix `useLinearIssueUpdate.ts`

Remove the silent error suppressor so `mutateAsync` propagates errors to the caller:

```typescript
// BEFORE:
onError: () => {},

// AFTER: remove the onError entirely (or leave it empty for logging if needed)
// The mutation body stays the same — just remove the onError handler
```

The full file after change:
```typescript
'use client'

import { useMutation } from '@tanstack/react-query'

export function useLinearIssueUpdate() {
  return useMutation({
    mutationFn: async ({ issueId, stateId }: { issueId: string; stateId: string }) => {
      const res = await fetch('/api/linear/update-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, stateId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Errore aggiornamento Linear')
      }
    },
  })
}
```

---

### 3. Supabase Realtime in `useTasks.ts`

Supabase Realtime sends a push to the client whenever the `tasks` table changes. The client then invalidates React Query — no polling, no page reload.

**Prerequisites:** The `tasks` table must be added to the Supabase Realtime publication (see migration below).

```typescript
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'

export function useTasks(projectId: string | null) {
  const queryClient = useQueryClient()

  // Supabase Realtime: invalidate React Query when tasks change remotely (e.g., from webhook)
  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])

  return useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function tasksByColumn(tasks: Task[], columnId: string): Task[] {
  return tasks
    .filter((t) => t.column_id === columnId)
    .sort((a, b) => a.position - b.position)
}
```

---

### 4. Supabase Realtime Migration

**File:** `supabase/migrations/20260320000001_realtime_tasks.sql`

```sql
-- Enable Supabase Realtime for the tasks table
-- Required for useTasks Realtime subscription to receive postgres_changes
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

> Apply via Supabase Dashboard → SQL Editor, or `supabase db push` if using local CLI.

---

### 5. Webhook Handler — `/api/linear/webhook/route.ts`

Linear sends `POST` requests to this endpoint on `issueUpdated`, `issueCreated`, and `issueRemoved` events.

**Linear Webhook Signature:** Every request includes an `linear-delivery` header and `linear-signature` (HMAC-SHA256 of body with `LINEAR_WEBHOOK_SECRET`). Verify before processing.

**Environment variable needed:** Add `LINEAR_WEBHOOK_SECRET` to Vercel environment and `.env.local`.

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// Verify Linear webhook signature
function verifyLinearSignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.LINEAR_WEBHOOK_SECRET
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return signature === expected
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('linear-signature')

  if (!verifyLinearSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = payload.type as string
  const action = payload.action as string

  // Only handle issue events
  if (type !== 'Issue') {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient()
  // Use service role for webhook (no user session available)
  // IMPORTANT: webhook route uses server client which reads SUPABASE_SERVICE_ROLE_KEY
  // Set this env var on Vercel alongside the other Supabase vars

  const issue = payload.data as {
    id: string
    title?: string
    description?: string
    priority?: number
    state?: { id: string; name: string }
    assignee?: { name: string; avatarUrl?: string }
    project?: { id: string }
    identifier?: string
    url?: string
  }

  if (!issue?.id) {
    return NextResponse.json({ ok: true })
  }

  if (action === 'remove') {
    // Delete task from local cache
    await supabase.from('tasks').delete().eq('linear_issue_id', issue.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'update' || action === 'create') {
    // Find the task by linear_issue_id
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id, column_id, project_id')
      .eq('linear_issue_id', issue.id)
      .single()

    if (!existingTask) {
      // Issue not in local cache — ignore (reconciliation handles missing issues)
      return NextResponse.json({ ok: true })
    }

    // Find the target column from the new state
    if (issue.state?.id) {
      // linear_state_id is stored as `${linearProjectId}:${linearStateId}`
      // Use LIKE to match by stateId suffix (handles missing projectId in webhook)
      const { data: targetColumn } = await supabase
        .from('columns')
        .select('id')
        .eq('project_id', existingTask.project_id)
        .like('linear_state_id', `%:${issue.state.id}`)
        .single()

      const updates: Record<string, unknown> = {}
      if (targetColumn) updates.column_id = targetColumn.id
      if (issue.title !== undefined) updates.title = issue.title
      if (issue.description !== undefined) updates.description = issue.description ?? null
      if (issue.assignee !== undefined) {
        updates.assignee_name = issue.assignee?.name ?? null
        updates.assignee_avatar = issue.assignee?.avatarUrl ?? null
      }
      if (issue.priority !== undefined) {
        const priorityMap: Record<number, string | null> = { 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' }
        updates.priority = priorityMap[issue.priority] ?? null
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('tasks')
          .update(updates)
          .eq('linear_issue_id', issue.id)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
```

> **Webhook registration:** After deploying, register the webhook URL in Linear → Settings → API → Webhooks:
> - URL: `https://<your-vercel-domain>/api/linear/webhook`
> - Events: `Issue` (all actions)
> - Secret: value of `LINEAR_WEBHOOK_SECRET`

> **Service role note:** The webhook has no authenticated user session. The `createClient()` from `@/lib/supabase/server` uses `SUPABASE_SERVICE_ROLE_KEY` env var (already set on Vercel) to bypass RLS for server-side operations. Verify this is set — if it falls back to anon key, updates will fail silently due to RLS.

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **Linear before Supabase** | For Linear projects, NEVER write to Supabase if Linear API fails. Check `isLinearProject` flag before choosing the flow. |
| **Snapshot rollback** | `tasksSnapshot.current` is captured in `handleDragStart` — always use it for rollback, never derive from current state. |
| **toast from component, not hook** | `KanbanBoard.tsx` shows the toast on Linear failure — `useLinearIssueUpdate` only throws, doesn't toast. |
| **No double call to Linear** | The mutation in `useLinearIssueUpdate` calls `/api/linear/update-issue` — do NOT also call `updateLinearIssue.mutate` after the `mutateAsync`. The old fire-and-forget call must be REMOVED. |
| **Realtime filter by project_id** | Channel filter `project_id=eq.${projectId}` prevents cross-project invalidations. |
| **Webhook: update, not upsert** | Use `.update()` not `.upsert()` for webhook task updates — avoids overwriting `position` and other fields not present in the webhook payload. |
| **Webhook: find column by LIKE** | `linear_state_id` is stored as `${linearProjectId}:${linearStateId}` — use `.like('linear_state_id', \`%:${stateId}\`)` scoped to the task's `project_id`. |
| **TypeScript strict** | No `any` types. Webhook payload typed with `Record<string, unknown>` at top level, narrowed before use. |
| **Immutability** | All React Query cache updates use `setQueryData` with a new array — never mutate in place. |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| Keeping `updateLinearIssue.mutate` (fire-and-forget) after the fix | Replace with `await updateLinearIssue.mutateAsync(...)` — errors must be catchable |
| Calling both `moveTask.mutateAsync` and `updateLinearIssue.mutateAsync` in parallel | Linear first (await), Supabase second (await) — sequential, not parallel |
| Using `.upsert()` in webhook handler | Use `.update()` — only modify fields present in the webhook payload |
| Using `supabase.from('columns').select(...).like('linear_state_id', \`%:${stateId}\`)` without project_id scoping | Always scope with `.eq('project_id', existingTask.project_id)` to avoid cross-project column matches |
| Skipping signature verification in webhook | ALWAYS verify `linear-signature` header before processing — Linear sends it for all webhooks |
| Creating a Supabase Edge Function | All Linear API routes are Next.js API routes — keep webhook consistent in `/api/linear/webhook/route.ts` |
| Showing toast in `useLinearIssueUpdate.onError` | Toast lives in `KanbanBoard.tsx` catch block — hook only propagates the error |
| Using `isLoading` for mutation state | TanStack Query v5 uses `isPending` for mutations (not `isLoading`) — but this story doesn't expose loading state in UI (optimistic update only) |

---

## Learnings from Stories 1.1–1.3

- **`mutateAsync` vs `mutate`:** `.mutate()` is fire-and-forget (errors go to `onError` only); `.mutateAsync()` returns a Promise that rejects on error — required here for sequential try/catch flow.
- **`toast` from sonner:** `import { toast } from 'sonner'` — already installed and used in `useLinearConnection.ts`. Same import in `KanbanBoard.tsx`.
- **React Query deduplication:** Multiple components calling `useTasks(projectId)` share the same cache — Realtime invalidation in `useTasks` benefits all consumers automatically.
- **`shrink-0` on icon elements:** Apply to spinner/icon in buttons to prevent flex truncation.
- **Virtual state IDs:** `linear_state_id` in columns is `${linearProjectId}:${linearStateId}` — when you only have `linearStateId` (from webhook or DnD), use `.split(':').pop()` to extract it, or LIKE query to match.
- **RLS in webhook routes:** Server-side routes with `createClient()` from `@/lib/supabase/server` use service role key — they bypass RLS. This is intentional and correct for webhooks (no user session).
- **Git commit pattern:** `feat: <description> (story X.Y)` — follow same format.

---

## File Change Summary

| Action | File |
|---|---|
| **MODIFY** | `src/components/projects/KanbanBoard.tsx` — fix task-move DnD: Linear first, Supabase on success, rollback + toast on failure |
| **MODIFY** | `src/hooks/useLinearIssueUpdate.ts` — remove `onError: () => {}` |
| **MODIFY** | `src/hooks/useTasks.ts` — add Supabase Realtime subscription |
| **CREATE** | `src/app/api/linear/webhook/route.ts` — webhook receiver |
| **CREATE** | `supabase/migrations/20260320000001_realtime_tasks.sql` — enable Realtime for tasks table |

No new npm dependencies. No Edge Functions.

---

## Definition of Done

- [ ] Dragging a task in a Linear Kanban project sends PATCH to Linear API and only updates Supabase if Linear responds successfully
- [ ] Dragging a task in a non-Linear project works as before (Supabase only, no toast)
- [ ] If Linear API returns an error during DnD, the task snaps back to its original column automatically
- [ ] `toast.error('Operazione non riuscita, riprova')` appears on Linear DnD failure
- [ ] The local Supabase `tasks` table is NOT modified when Linear DnD fails
- [ ] `POST /api/linear/webhook` returns 401 for requests without a valid `linear-signature`
- [ ] `POST /api/linear/webhook` processes `issueUpdated` and updates the task's `column_id` in Supabase when state changes
- [ ] `POST /api/linear/webhook` handles `issueRemoved` by deleting the task from Supabase
- [ ] After a webhook-triggered DB update, the Kanban UI refreshes without a page reload (Supabase Realtime → React Query invalidation)
- [ ] Realtime subscription is properly cleaned up on component unmount (channel removed)
- [ ] No TypeScript errors (`strict: true`, `npx tsc --noEmit` clean)
- [ ] `useLinearIssueUpdate` no longer silently swallows errors

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
