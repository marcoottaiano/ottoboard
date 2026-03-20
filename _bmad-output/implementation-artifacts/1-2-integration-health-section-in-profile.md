# Story 1.2: Integration Health Section in Profile

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.2
**Story Key:** `1-2-integration-health-section-in-profile`
**Status:** review
**Created:** 2026-03-20

---

## User Story

As a user,
I want to see a dedicated Integration Health section in /profile with human-readable status and error logs for each integration (Strava, Linear),
So that I can diagnose sync failures without inspecting network logs or contacting the developer.

---

## Acceptance Criteria

**Given** I navigate to /profile and open the Integrations section
**When** an integration is functioning correctly
**Then** I see "Strava: Connected — Last sync: [timestamp]" and "Linear: Connected — Last sync: [timestamp]" in green

**Given** an integration has a sync error (e.g., 401 Unauthorized on Linear sync)
**When** I view the Integration Health card for that service
**Then** I see a human-readable error message (e.g., "Linear Sync: Webhook 401 — Unauthorized") with the timestamp of the failure

**Given** the integration error card is displayed
**When** I look at the card
**Then** I can see the last 5 error log entries sorted by timestamp DESC

---

## Context for the Dev Agent

### What This Story Does

Adds a **dedicated Integration Health section** to `/profile` below the existing 3-column integration management grid (Strava | Linear | Notifications). The new section shows:
- Per-integration health status (connected + last sync timestamp in green, or error state in red)
- The last 5 error log entries per integration sorted by `occurred_at` DESC

This requires:
1. A new DB table `integration_error_logs` to persist sync errors
2. Extending the existing sync API routes to write error logs on failure
3. A new API route `/api/integration-health` to retrieve error logs
4. A new `useIntegrationHealth` hook
5. A new `IntegrationHealthSection` component inserted into `/profile`

---

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `StravaIntegrationCard` | `src/components/profile/StravaIntegrationCard.tsx` | Shows connected/disconnected + last sync + sync/disconnect buttons — DO NOT modify this for health logs |
| `LinearIntegrationCard` | `src/components/profile/LinearIntegrationCard.tsx` | Shows connected/disconnected + last sync + team selector + sync/disconnect buttons — DO NOT modify |
| `useLinearConnection()` | `src/hooks/useLinearConnection.ts` | Returns `lastSyncedAt`, `isConnected`, `isConnectionError` — reuse as-is |
| `useStravaConnection()` | `src/hooks/useStravaConnection.ts` | Returns `lastSyncedAt`, `isConnected`, `isConnectionError` — reuse as-is |
| `/api/linear/status` | `src/app/api/linear/status/route.ts` | Returns `connected`, `selectedTeamId`, `selectedTeamName`, `lastSyncedAt` — DO NOT modify, query `linear_tokens` table |
| `/api/strava/status` | `src/app/api/strava/status/route.ts` | Returns `connected`, `athleteId`, `lastSyncedAt`, `expiresAt` — DO NOT modify |
| `/api/linear/sync` | `src/app/api/linear/sync/route.ts` | Returns `synced: { projects, columns, tasks, unassigned }` — MUST BE EXTENDED to write error logs on failure |
| `/api/strava/sync` | `src/app/api/strava/sync/route.ts` | Returns `synced: number` — MUST BE EXTENDED to write error logs on failure |
| Supabase admin client | `src/lib/supabase/admin.ts` | Service-role client for server-side ops — use in API routes |

### What Must Be Created

| New Item | File | Notes |
|---|---|---|
| DB migration | `supabase/migrations/<timestamp>_integration_error_logs.sql` | New table + RLS policy |
| API route | `src/app/api/integration-health/route.ts` | GET — returns error logs for both services |
| Hook | `src/hooks/useIntegrationHealth.ts` | React Query hook consuming the API |
| Component | `src/components/profile/IntegrationHealthSection.tsx` | New UI section in profile |

---

## Technical Implementation

### 1. Database Migration

**File:** `supabase/migrations/<timestamp>_integration_error_logs.sql`

```sql
CREATE TABLE integration_error_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  service      TEXT NOT NULL CHECK (service IN ('linear', 'strava')),
  error_message TEXT NOT NULL,
  error_code   TEXT,          -- e.g. '401', '500', 'network_error'
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — mandatory pattern for every new table
ALTER TABLE integration_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own integration error logs"
ON integration_error_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

> **CRITICAL RLS Rule:** The policy needs BOTH `USING` (for SELECT/UPDATE/DELETE) AND `WITH CHECK` (for INSERT/UPDATE). Missing `WITH CHECK` causes silent RLS 403 on INSERT from client.
>
> The `DEFAULT auth.uid()` on `user_id` allows server-side inserts without explicitly passing `user_id`.

---

### 2. Write Error Logs on Sync Failure

**Files to modify:**
- `src/app/api/linear/sync/route.ts`
- `src/app/api/strava/sync/route.ts`

Both routes currently return an error response on failure but do NOT persist the error. Add a call to `supabase.from('integration_error_logs').insert(...)` in the catch/error branches.

**Pattern to add at each failure point in `linear/sync/route.ts`:**

```typescript
// After catching a Linear API error:
await supabase
  .from('integration_error_logs')
  .insert({
    service: 'linear',
    error_message: 'Linear Sync: API communication error',
    error_code: '500',
  })
// Then return the existing error response as-is
return NextResponse.json({ error: 'Errore nella comunicazione con Linear' }, { status: 500 })
```

**Pattern for `strava/sync/route.ts`:**

```typescript
await supabase
  .from('integration_error_logs')
  .insert({
    service: 'strava',
    error_message: `Strava Sync: ${err instanceof Error ? err.message : 'Unknown error'}`,
    error_code: '500',
  })
```

> **DO NOT** use `upsert()` here — these are append-only log entries. Use `insert()` only.
>
> The `user_id` is auto-set by `DEFAULT auth.uid()` from the authenticated Supabase client.

---

### 3. New API Route `/api/integration-health`

**File:** `src/app/api/integration-health/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ linear: [], strava: [] })
  }

  const { data, error } = await supabase
    .from('integration_error_logs')
    .select('id, service, error_message, error_code, occurred_at')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(10) // fetch 10; UI displays last 5 per service

  if (error) {
    return NextResponse.json({ linear: [], strava: [] })
  }

  const linear = (data ?? []).filter(e => e.service === 'linear').slice(0, 5)
  const strava = (data ?? []).filter(e => e.service === 'strava').slice(0, 5)

  return NextResponse.json({ linear, strava })
}
```

---

### 4. New Hook `useIntegrationHealth`

**File:** `src/hooks/useIntegrationHealth.ts`

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface IntegrationErrorLog {
  id: string
  service: 'linear' | 'strava'
  error_message: string
  error_code: string | null
  occurred_at: string
}

interface IntegrationHealth {
  linear: IntegrationErrorLog[]
  strava: IntegrationErrorLog[]
}

export function useIntegrationHealth() {
  return useQuery<IntegrationHealth>({
    queryKey: ['integration-health'],
    queryFn: async () => {
      const res = await fetch('/api/integration-health')
      if (!res.ok) throw new Error('Errore fetch integration health')
      return res.json()
    },
    staleTime: 60_000, // 1 minute — error logs don't change frequently
  })
}
```

---

### 5. New Component `IntegrationHealthSection`

**File:** `src/components/profile/IntegrationHealthSection.tsx`

**Design specs:**
- Two-column grid on desktop (md:grid-cols-2), single column on mobile
- Module color: `sky` (profile module color — `sky-400/500`)
- Same card pattern as existing integration cards: `rounded-xl border border-white/[0.08] bg-white/[0.03] p-5`
- Skeleton loader (animate-pulse) while loading, not a spinner
- Error logs list: up to 5 entries, most recent first
- Each log entry: timestamp (left, `text-white/40 text-xs`) + error message (right, `text-red-400/80 text-xs`)
- "No errors in the last period" state when `errorLogs.length === 0` and integration is connected

```typescript
'use client'

import { Activity, Link2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth'
import { useLinearConnection } from '@/hooks/useLinearConnection'
import { useStravaConnection } from '@/hooks/useStravaConnection'

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ServiceHealthCard({
  name,
  icon,
  color,
  isConnected,
  isLoading: connectionLoading,
  lastSyncedAt,
  errorLogs,
  logsLoading,
}: {
  name: string
  icon: React.ReactNode
  color: 'orange' | 'purple'
  isConnected: boolean
  isLoading: boolean
  lastSyncedAt?: string
  errorLogs: Array<{ id: string; error_message: string; occurred_at: string }>
  logsLoading: boolean
}) {
  const colorMap = {
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={colorMap[color]}>{icon}</span>
          <h3 className="text-sm font-semibold text-white/80">{name}</h3>
        </div>

        {!connectionLoading && (
          <div className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            isConnected && errorLogs.length === 0
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : isConnected && errorLogs.length > 0
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-white/[0.05] text-white/30 border border-white/[0.08]',
          ].join(' ')}>
            {isConnected && errorLogs.length === 0 && <><CheckCircle size={11} /> Operativo</>}
            {isConnected && errorLogs.length > 0 && <><AlertCircle size={11} /> Errori rilevati</>}
            {!isConnected && <><AlertCircle size={11} /> Non connesso</>}
          </div>
        )}
      </div>

      {/* Last sync */}
      {isConnected && (
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Clock size={11} />
          Ultimo sync: <span className="text-white/60">{lastSyncedAt
            ? formatTimestamp(lastSyncedAt)
            : 'Mai'}</span>
        </div>
      )}

      {/* Error logs */}
      {logsLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : errorLogs.length === 0 && isConnected ? (
        <p className="text-xs text-white/30 italic">Nessun errore registrato di recente.</p>
      ) : errorLogs.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Ultimi errori
          </p>
          <ul className="space-y-1.5">
            {errorLogs.map(log => (
              <li
                key={log.id}
                className="rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2 space-y-0.5"
              >
                <p className="text-xs text-red-400/90">{log.error_message}</p>
                <p className="text-xs text-white/30">{formatTimestamp(log.occurred_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isConnected && (
        <p className="text-xs text-white/30">
          Connetti l'integrazione per monitorarne la salute.
        </p>
      )}
    </div>
  )
}

export function IntegrationHealthSection() {
  const { data: health, isLoading: logsLoading } = useIntegrationHealth()
  const { isConnected: linearConnected, isLoading: linearLoading, lastSyncedAt: linearLastSync } = useLinearConnection()
  const { isConnected: stravaConnected, isLoading: stravaLoading, lastSyncedAt: stravaLastSync } = useStravaConnection()

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">
        Salute Integrazioni
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ServiceHealthCard
          name="Strava"
          icon={<Activity size={16} />}
          color="orange"
          isConnected={stravaConnected}
          isLoading={stravaLoading}
          lastSyncedAt={stravaLastSync}
          errorLogs={health?.strava ?? []}
          logsLoading={logsLoading}
        />
        <ServiceHealthCard
          name="Linear"
          icon={<Link2 size={16} />}
          color="purple"
          isConnected={linearConnected}
          isLoading={linearLoading}
          lastSyncedAt={linearLastSync}
          errorLogs={health?.linear ?? []}
          logsLoading={logsLoading}
        />
      </div>
    </div>
  )
}
```

---

### 6. Mount `IntegrationHealthSection` in `/profile`

**File:** `src/app/profile/page.tsx`

**Current layout (DO NOT CHANGE existing structure — only append):**
```tsx
// Current last section:
<div className="space-y-2">
  <h3 ...>Integrazioni</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
    <StravaIntegrationCard />
    <LinearIntegrationCard />
    <NotificationsCard />
  </div>
</div>
```

**Add BELOW the Integrazioni section:**
```tsx
import { IntegrationHealthSection } from '@/components/profile/IntegrationHealthSection'

// Inside <div className="space-y-6 max-w-5xl">
<IntegrationHealthSection />
```

> Note: `IntegrationHealthSection` uses `useIntegrationHealth()`, `useLinearConnection()`, and `useStravaConnection()` — all client-side hooks. Since `ProfilePage` is a `async` Server Component (`'force-dynamic'`), `IntegrationHealthSection` must be a Client Component (`'use client'`). The component already has `'use client'` at the top.

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **New table RLS** | `integration_error_logs` must have `USING + WITH CHECK` policy. `user_id DEFAULT auth.uid()` prevents 403 on INSERT. |
| **insert() not upsert()** | Error logs are append-only. Never use `upsert()` — it would overwrite previous entries if a conflict key existed. |
| **Supabase client in API routes** | Use `createClient()` from `@/lib/supabase/server` (not `admin.ts`) — RLS applies automatically via the authenticated session. |
| **TypeScript strict** | `IntegrationErrorLog.error_code` is `string \| null` — handle both. `health?.linear ?? []` for safe fallback. |
| **No new color families** | The section header uses `text-white/30` (neutral). Service cards use `orange-400` (Strava) and `purple-400` (Linear) — their module colors. Status badges use neutral `emerald/amber/white` for state. |
| **Skeleton loader not spinner** | Loading state: `animate-pulse bg-white/5 rounded-lg h-8` per row. Pattern from UX-DR9. |
| **useLinearConnection disabled prop** | `useLinearConnection()` accepts `{ enabled?: boolean }`. Do NOT pass `enabled: false` here — the health section needs the connection status. |
| **No toISOString() for display** | `formatTimestamp()` uses `new Date(iso).toLocaleString('it-IT', ...)` — locale-aware display, not `toISOString()`. |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| Modifying `StravaIntegrationCard` or `LinearIntegrationCard` | Create new `IntegrationHealthSection` component — existing cards are not changed |
| Adding error log query to `/api/linear/status` or `/api/strava/status` | Create separate `/api/integration-health` route — status routes are used by widgets and should stay lightweight |
| Using `upsert()` for `integration_error_logs` inserts | Use `insert()` — error logs are append-only records |
| Duplicating `formatDate()` from existing cards | Create new `formatTimestamp()` in the new component (it can inline it — the function is trivial) |
| Direct `fetch()` in component | Use `useIntegrationHealth()` hook with React Query |
| Creating a new Supabase client inside hook | Import `useQuery` from `@tanstack/react-query` and call `fetch('/api/integration-health')` — same pattern as `useLinearConnection` |
| Using `toISOString().slice(0, 10)` for display | Use `toLocaleString('it-IT', ...)` for human-readable timestamps |

---

## Learnings from Story 1.1

- `useLinearConnection()` accepts `{ enabled?: boolean }` — when used in `KanbanColumnWidget` it's sometimes disabled. In `IntegrationHealthSection`, DO NOT pass `enabled: false` — we always want the status.
- React Query deduplicates identical `queryKey` values: if `LinearIntegrationCard` and `IntegrationHealthSection` both call `useLinearConnection()`, only ONE fetch fires for `['linear-status']`. No performance concern.
- `shrink-0` is important for badge/icon elements that could be truncated in flex rows.
- The `SyncStatusBadge` was placed in `src/components/ui/` because it's shared across modules. `IntegrationHealthSection` goes in `src/components/profile/` because it's profile-specific.
- DO NOT add `overflow-hidden` to the container holding the health section — no dropdowns to worry about here, but keep it as a rule.

---

## File Change Summary

| Action | File |
|---|---|
| **CREATE** | `supabase/migrations/<timestamp>_integration_error_logs.sql` |
| **CREATE** | `src/app/api/integration-health/route.ts` |
| **CREATE** | `src/hooks/useIntegrationHealth.ts` |
| **CREATE** | `src/components/profile/IntegrationHealthSection.tsx` |
| **MODIFY** | `src/app/api/linear/sync/route.ts` (write error log on failure) |
| **MODIFY** | `src/app/api/strava/sync/route.ts` (write error log on failure) |
| **MODIFY** | `src/app/profile/page.tsx` (import + mount `IntegrationHealthSection`) |

No Edge Function changes required. No new npm dependencies.

---

## Definition of Done

- [x] `integration_error_logs` table created with correct RLS policy (USING + WITH CHECK)
- [x] `/api/linear/sync` writes to `integration_error_logs` when Linear API call fails
- [x] `/api/strava/sync` writes to `integration_error_logs` when Strava API call fails
- [x] `/api/integration-health` returns last 5 error logs per service for the authenticated user
- [x] `IntegrationHealthSection` renders below the existing Integrazioni section in `/profile`
- [x] "Strava: Connected — Last sync: [timestamp]" displays in green when healthy
- [x] "Linear: Connected — Last sync: [timestamp]" displays in green when healthy
- [x] Error log entries shown (max 5, DESC by occurred_at) when errors exist
- [x] "Nessun errore registrato di recente." shown when integration is connected and error list is empty
- [x] Skeleton loader shown while data fetches (not a spinner)
- [x] No TypeScript errors (`strict: true`)
- [x] `useLinearConnection()` and `useStravaConnection()` calls are deduplicated by React Query (no double fetch)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- ✅ DB migration applicata via Supabase MCP — tabella `integration_error_logs` creata con RLS (USING + WITH CHECK + DEFAULT auth.uid())
- ✅ Migration SQL salvata anche in `supabase/migrations/20260320000000_integration_error_logs.sql`
- ✅ `/api/integration-health` — GET route che restituisce ultimi 5 log per service, query con `.limit(10)` e slice client-side per service
- ✅ `useIntegrationHealth` — React Query hook con `staleTime: 60_000` ms, pattern identico a `useLinearConnection`
- ✅ `IntegrationHealthSection` — componente client con `ServiceHealthCard` interno, skeleton loader animate-pulse, 3 stati badge (emerald=operativo, amber=errori rilevati, white=non connesso)
- ✅ `linear/sync/route.ts` — error log insert su 2 failure points: decrypt API key + Linear API communication error
- ✅ `strava/sync/route.ts` — error log insert su 2 failure points: getActivitiesAfter throw (con try/catch aggiunto) + upsertError
- ✅ `profile/page.tsx` — `<IntegrationHealthSection />` montato sotto la sezione Integrazioni esistente
- ✅ `npx tsc --noEmit` — zero errori TypeScript strict
- ✅ React Query deduplication: `useLinearConnection()` usa queryKey `['linear-status']`, `useStravaConnection()` usa `['stravaConnection']` — nessun double fetch se i componenti esistenti sono anche montati

### File List

- `supabase/migrations/20260320000000_integration_error_logs.sql` (created)
- `src/app/api/integration-health/route.ts` (created)
- `src/hooks/useIntegrationHealth.ts` (created)
- `src/components/profile/IntegrationHealthSection.tsx` (created)
- `src/app/api/linear/sync/route.ts` (modified — error log on decrypt failure + API failure)
- `src/app/api/strava/sync/route.ts` (modified — try/catch on getActivitiesAfter + error log on upsertError)
- `src/app/profile/page.tsx` (modified — import + mount IntegrationHealthSection)

### Change Log

- 2026-03-20: Story implementata — DB migration, API route, hook, componente, logging errori sync. TypeScript clean. Status → review.
