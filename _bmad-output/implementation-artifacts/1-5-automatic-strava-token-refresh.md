# Story 1.5: Automatic Strava Token Refresh

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.5
**Story Key:** `1-5-automatic-strava-token-refresh`
**Status:** ready-for-dev
**Created:** 2026-03-20

---

## User Story

As a user,
I want the system to automatically refresh my Strava OAuth token before it expires,
So that my fitness data is always synced without manual re-authentication.

---

## Acceptance Criteria

**Given** a Strava access token is within 24 hours of expiration
**When** the scheduled cron runs nightly
**Then** the token is refreshed using the stored refresh_token and the new access_token + refresh_token + expires_at are saved to Supabase

**Given** the Strava token refresh call fails (e.g., refresh_token revoked)
**When** the error occurs
**Then** the error is logged in `integration_error_logs` with `error_code: 'TOKEN_REVOKED'` and the user's `user_id`
**And** on the next visit to /profile, the user sees "Strava: Re-authentication required" with a "Reconnetti Strava" CTA

**Given** the Strava token is valid and more than 24h from expiration
**When** the nightly cron runs
**Then** no refresh call is made for that user (no unnecessary API requests)

---

## Context for the Dev Agent

### What This Story Does

**Part A — Nightly proactive token refresh:** Create a new Next.js API route `/api/strava/cron-token-refresh` called by a Vercel Cron at 02:00 UTC nightly. It uses `createAdminClient()` (service role, bypasses RLS) to query ALL `strava_tokens` rows where the token expires within the next 24 hours, then refreshes each one.

**Part B — Error logging with TOKEN_REVOKED:** When refresh fails (revoked refresh_token), log to `integration_error_logs` with `error_code: 'TOKEN_REVOKED'` and explicit `user_id` (required because the cron uses service role, not a user session).

**Part C — Profile UI re-auth state:** Modify `StravaIntegrationCard` to detect the `TOKEN_REVOKED` error in integration health logs and show a "Re-authentication required" warning with a Reconnect CTA, even when `isConnected = true` (token row still exists, just stale).

---

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `refreshToken()` | `src/lib/strava/client.ts:7` | Private function that calls `POST https://www.strava.com/oauth/token` with `grant_type: refresh_token` — **export it** as `refreshStravaToken` for use in the cron route |
| `getStravaToken()` | `src/lib/strava/client.ts:25` | On-demand lazy refresh (5-min buffer) — already works for sync; story 1.5 adds the proactive nightly layer on top |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Service role Supabase client that bypasses RLS — required for cron (no user session) |
| `integration_error_logs` | Supabase table | Fields: `id`, `user_id`, `service`, `error_message`, `error_code`, `occurred_at` — already used in sync routes; in cron route, pass `user_id` explicitly |
| Cron auth pattern | `src/app/api/notifications/cron/route.ts:11-16` | `Authorization: Bearer ${PUSH_NOTIFICATIONS_SECRET}` header check — replicate exactly |
| `useIntegrationHealth()` | `src/hooks/useIntegrationHealth.ts` | Returns `{ strava: IntegrationErrorLog[], linear: IntegrationErrorLog[] }` — strava logs include `error_code` field |
| `useStravaConnection()` | `src/hooks/useStravaConnection.ts` | Returns `isConnected`, `connect` (triggers OAuth) — use in StravaIntegrationCard to trigger re-auth |
| `vercel.json` | project root | Has one existing cron — add a second entry for the token refresh cron |

---

### What Must Be Created / Modified

| Action | File | Notes |
|---|---|---|
| **MODIFY** | `src/lib/strava/client.ts` | Export `refreshToken` as `refreshStravaToken` (rename + export) |
| **CREATE** | `src/app/api/strava/cron-token-refresh/route.ts` | GET handler: verify Bearer auth → query tokens expiring <24h → refresh each → log errors |
| **MODIFY** | `vercel.json` | Add second cron entry for token refresh at 02:00 UTC |
| **MODIFY** | `src/components/profile/StravaIntegrationCard.tsx` | Add TOKEN_REVOKED detection from `useIntegrationHealth()` + re-auth warning UI |

No new npm dependencies. No new DB schema or migrations (reuses existing tables).

---

## Technical Implementation

### 1. Export `refreshStravaToken` from `src/lib/strava/client.ts`

```typescript
// BEFORE (line 7): private function
async function refreshToken(...)

// AFTER: export it so the cron can use it
export async function refreshStravaToken(
  refreshTokenStr: string
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshTokenStr,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Strava token refresh fallito')
  return res.json()
}
```

Update the call site at line 42: `const newToken = await refreshStravaToken(data.refresh_token)`

---

### 2. Cron route — `src/app/api/strava/cron-token-refresh/route.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshStravaToken } from '@/lib/strava/client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Auth: same pattern as /api/notifications/cron
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  // Find all tokens expiring within the next 24 hours
  const { data: tokens, error } = await supabase
    .from('strava_tokens')
    .select('user_id, refresh_token, expires_at')
    .lt('expires_at', threshold)

  if (error || !tokens || tokens.length === 0) {
    return NextResponse.json({ refreshed: 0 })
  }

  let refreshed = 0
  const errors: string[] = []

  for (const tokenRow of tokens) {
    try {
      const newToken = await refreshStravaToken(tokenRow.refresh_token)

      await supabase
        .from('strava_tokens')
        .update({
          access_token: newToken.access_token,
          refresh_token: newToken.refresh_token,
          expires_at: new Date(newToken.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', tokenRow.user_id)

      refreshed++
    } catch (err) {
      // Log failure — must pass user_id explicitly (no RLS session in service role context)
      await supabase.from('integration_error_logs').insert({
        user_id: tokenRow.user_id,
        service: 'strava',
        error_message: 'Strava Token Refresh: Re-authentication required — refresh token revoked',
        error_code: 'TOKEN_REVOKED',
      })
      errors.push(tokenRow.user_id)
    }
  }

  return NextResponse.json({ refreshed, errors: errors.length })
}
```

---

### 3. Update `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/notifications/cron",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/strava/cron-token-refresh",
      "schedule": "0 2 * * *"
    }
  ]
}
```

> Runs at 02:00 UTC nightly. Strava tokens typically expire every 6 hours — Strava always provides a new `refresh_token` on each refresh, so the rolling refresh chain continues indefinitely unless the user revokes access in Strava settings.

---

### 4. Modify `StravaIntegrationCard.tsx` — Re-auth state

When `TOKEN_REVOKED` is in the strava error logs, the user is still "connected" (token row exists) but the access_token is stale. Show a warning with a reconnect CTA.

```typescript
'use client'

import { RefreshCw, Unlink, Zap, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth'

// ... (formatDate unchanged)

export function StravaIntegrationCard() {
  const { isConnected, isLoading, athleteId, lastSyncedAt, connect, disconnect, sync, isSyncing, isDisconnecting, syncedCount } = useStravaConnection()
  const { data: health } = useIntegrationHealth()

  // Detect re-auth required: most recent strava error has error_code TOKEN_REVOKED
  const requiresReAuth =
    isConnected &&
    (health?.strava ?? []).some((log) => log.error_code === 'TOKEN_REVOKED')

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header — unchanged */}
      ...

      {/* Re-auth warning — shown above normal connected state when token is revoked */}
      {!isLoading && requiresReAuth && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
            <ShieldAlert size={13} className="shrink-0" />
            Re-authentication required
          </div>
          <p className="text-xs text-white/40 leading-snug">
            Il token di accesso Strava è scaduto e non può essere rinnovato automaticamente.
          </p>
          <button
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-xs font-medium"
          >
            <Zap size={13} />
            Reconnetti Strava
          </button>
        </div>
      )}

      {/* Normal connected state — only show if NOT re-auth required */}
      {!isLoading && isConnected && !requiresReAuth && (
        // ... existing connected JSX unchanged
      )}

      {/* Not connected state — unchanged */}
      {!isLoading && !isConnected && (
        // ... existing not-connected JSX unchanged
      )}
    </div>
  )
}
```

> **Key invariant:** `requiresReAuth` is true only when `isConnected && TOKEN_REVOKED` — i.e., the token row still exists but the refresh_token is revoked. The "Reconnetti" button calls the same `connect()` that triggers the OAuth flow, which creates a fresh token row via the callback route.

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **Service role for cron** | Cron has no user session → use `createAdminClient()` (reads `SUPABASE_SERVICE_ROLE_KEY`). RLS is bypassed → pass `user_id` explicitly in all inserts. |
| **Bearer auth for cron** | Same `PUSH_NOTIFICATIONS_SECRET` env var already in Vercel/`.env.local` — no new secret needed. |
| **No lazy refresh duplication** | `getStravaToken()` (lazy, on-demand) continues to work unchanged. The nightly cron is a separate proactive layer — both coexist. |
| **update(), not upsert()** | Use `.update()` on `strava_tokens` — the row always exists at this point, and partial upsert would overwrite other columns with NULL. |
| **error_code: 'TOKEN_REVOKED'** | Use this exact string so `StravaIntegrationCard` can detect it via `log.error_code === 'TOKEN_REVOKED'`. Consistent across cron and any future token-failure paths. |
| **TypeScript strict** | No `any`. `tokens` from Supabase typed as `{ user_id: string; refresh_token: string; expires_at: string }[]`. |
| **Immutability** | All state computed from query data — no mutations of query results. |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| Calling `getStravaToken()` from the cron | `getStravaToken()` uses the user session Supabase client; cron must use `createAdminClient()` and call `refreshStravaToken()` directly |
| Inserting to `integration_error_logs` without `user_id` in admin context | Always pass `user_id: tokenRow.user_id` when using service role — RLS DEFAULT won't apply |
| Deleting the strava_tokens row on refresh failure | Keep the row — it still contains the athlete_id and historical data; just log the error |
| Using `upsert()` on strava_tokens in the cron | Use `update()` — the row already exists |
| Using `useEffect` to poll for token refresh in the browser | Token refresh is server-side only (cron) — never expose refresh_token to client |
| Adding `requiresReAuth` check only in `IntegrationHealthSection` | Must also be in `StravaIntegrationCard` to show the reconnect CTA near the "Connetti" button |

---

## Learnings from Stories 1.1–1.4

- **Admin client pattern:** `createAdminClient()` from `src/lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` — verify it's set on Vercel. Already used in `notifications/cron/route.ts` — same pattern.
- **Cron auth:** `PUSH_NOTIFICATIONS_SECRET` Bearer header — already in `.env.local` and Vercel. No new env var needed for the Strava cron.
- **`integration_error_logs` user_id:** In session-context routes (strava/sync), `user_id` is implicit via RLS. In service role routes, it must be explicit — see the cron implementation above.
- **Vercel Cron limits:** Free/Hobby tier supports up to 2 cron jobs. Adding the Strava cron brings the total to 2 — within limits.
- **Toast vs error log:** For cron failures, log to `integration_error_logs` (for /profile visibility). No toast — the cron runs server-side with no user session.

---

## File Change Summary

| Action | File |
|---|---|
| **MODIFY** | `src/lib/strava/client.ts` — export `refreshToken` as `refreshStravaToken` |
| **CREATE** | `src/app/api/strava/cron-token-refresh/route.ts` — nightly proactive token refresh |
| **MODIFY** | `vercel.json` — add cron for `/api/strava/cron-token-refresh` at `0 2 * * *` |
| **MODIFY** | `src/components/profile/StravaIntegrationCard.tsx` — add TOKEN_REVOKED re-auth state |

No new migrations. No new npm dependencies.

---

## Definition of Done

- [ ] `GET /api/strava/cron-token-refresh` returns 401 without valid `Authorization: Bearer` header
- [ ] `GET /api/strava/cron-token-refresh` queries all `strava_tokens` where `expires_at < NOW() + 24h`
- [ ] For each expiring token: refreshes via Strava API and updates the row with new `access_token`, `refresh_token`, `expires_at`
- [ ] On refresh failure: inserts to `integration_error_logs` with `service: 'strava'`, `error_code: 'TOKEN_REVOKED'`, explicit `user_id`
- [ ] On refresh failure: does NOT delete the `strava_tokens` row
- [ ] Tokens with `expires_at > NOW() + 24h` are NOT refreshed by the cron
- [ ] `vercel.json` has cron at `0 2 * * *` for `/api/strava/cron-token-refresh`
- [ ] `StravaIntegrationCard` shows "Re-authentication required" warning with "Reconnetti Strava" button when the most recent strava error log has `error_code === 'TOKEN_REVOKED'`
- [ ] The "Reconnetti Strava" button triggers the same OAuth flow as the original "Connetti Strava" button
- [ ] `refreshStravaToken` is exported from `src/lib/strava/client.ts`
- [ ] No TypeScript errors (`npx tsc --noEmit` clean)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
