# Story 1.6: Integration Token Expiration Warning Banners

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.6
**Story Key:** `1-6-integration-token-expiration-warning-banners`
**Status:** ready-for-dev
**Created:** 2026-03-20

---

## User Story

As a user,
I want to see a UI warning when an integration token is nearing expiration (< 48h) or has already expired,
So that I can renew it proactively before losing access to synced data.

---

## Acceptance Criteria

**Given** a Strava token will expire within 48 hours
**When** I visit the home dashboard or /profile
**Then** a non-blocking banner is displayed: "Strava: il token scade in [X ore] — Rinnova ora"
**And** the banner links directly to the Strava integration card in /profile

**Given** the Strava token has already expired
**When** I visit the home dashboard or /profile
**Then** the banner shows "Strava: connessione persa — Riautentica" with a "Risolvi ora" link
**And** the SyncStatusBadge on the affected widget shows an error state (handled by existing widget badges from story 1.1)

**Given** the Linear API key has been revoked (recent 401 error in integration_error_logs)
**When** I visit the home dashboard or /profile
**Then** a banner shows "Linear: connessione persa — Riautentica" with a "Risolvi ora" link

**Given** both tokens are valid and no 401 errors exist
**When** I visit the home dashboard or /profile
**Then** no expiration banner is shown

**Given** a token is renewed successfully (Strava: new expires_at far in future; Linear: no recent 401 errors)
**When** the renewal completes and React Query refreshes
**Then** the warning banner disappears automatically

---

## Context for the Dev Agent

### What This Story Does

**Pure frontend story.** No new API routes, no DB migrations. Two new files:
1. `useIntegrationExpirationWarning` hook — computes warning state from existing hooks
2. `IntegrationExpirationBanner` component — renders the banner(s) non-blocking

The banner is mounted once in `src/app/page.tsx` (home) and once in `src/app/profile/page.tsx`. It auto-dismisses when the underlying condition resolves (React Query cache update).

**Linear note:** Linear API keys technically do not expire, but they can be revoked. "Token expiration" for Linear means: the latest `integration_error_logs` entry for Linear has `error_code === 'TOKEN_REVOKED'` or `error_code` contains '401'. The banner prompts re-authentication by linking to /profile where the user can re-enter the API key.

---

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `useStravaConnection()` | `src/hooks/useStravaConnection.ts:16` | Returns `expiresAt?: string` (ISO timestamp) — use to compute hours until expiry |
| `useIntegrationHealth()` | `src/hooks/useIntegrationHealth.ts:18` | Returns `{ strava: IntegrationErrorLog[], linear: IntegrationErrorLog[] }` — linear logs with `error_code` for detecting revoked API keys |
| `IntegrationErrorLog` interface | `src/hooks/useIntegrationHealth.ts:6` | `{ id, service, error_message, error_code: string | null, occurred_at }` |
| `useLinearConnection()` | `src/hooks/useLinearConnection.ts:30` | Returns `isConnected` — use to gate linear warning (only show if was connected) |
| `NotificationPermissionBanner` | `src/components/home/NotificationPermissionBanner.tsx` | Reference for non-invasive banner pattern: fixed placement, `'use client'`, no dismiss |
| Home page | `src/app/page.tsx:95` | `'use client'`, has imports section — add banner just before the `<div className="p-4 md:p-6 space-y-4...">` |
| Profile page | `src/app/profile/page.tsx:22` | Server component — add client banner just after `<h1>Profilo</h1>` |
| Module color: `sky` for profile | design system | Banner uses `sky-400/500` tones (profile module color) since it links to /profile |

---

### What Must Be Created / Modified

| Action | File | Notes |
|---|---|---|
| **CREATE** | `src/hooks/useIntegrationExpirationWarning.ts` | Computes warning state from `useStravaConnection` + `useIntegrationHealth` + `useLinearConnection` |
| **CREATE** | `src/components/ui/IntegrationExpirationBanner.tsx` | Renders warning banner(s) — non-blocking, no dismiss, links to /profile |
| **MODIFY** | `src/app/page.tsx` | Mount `<IntegrationExpirationBanner />` at top of page content, before the widgets grid |
| **MODIFY** | `src/app/profile/page.tsx` | Mount `<IntegrationExpirationBanner />` at top, after `<h1>Profilo</h1>` |

No new npm dependencies. No API routes. No migrations.

---

## Technical Implementation

### 1. `useIntegrationExpirationWarning.ts`

```typescript
'use client'

import { useStravaConnection } from './useStravaConnection'
import { useIntegrationHealth } from './useIntegrationHealth'
import { useLinearConnection } from './useLinearConnection'

export interface ExpirationWarning {
  service: 'strava' | 'linear'
  expired: boolean          // true = already expired/lost; false = expiring soon
  hoursUntilExpiry?: number // only for Strava expiring-soon case
}

export function useIntegrationExpirationWarning(): ExpirationWarning[] {
  const { isConnected: stravaConnected, expiresAt } = useStravaConnection()
  const { isConnected: linearConnected } = useLinearConnection()
  const { data: health } = useIntegrationHealth()

  const warnings: ExpirationWarning[] = []

  // Strava: check token expiry
  if (stravaConnected && expiresAt) {
    const expiresMs = new Date(expiresAt).getTime()
    const nowMs = Date.now()
    const hoursUntilExpiry = (expiresMs - nowMs) / (1000 * 60 * 60)

    if (hoursUntilExpiry <= 0) {
      warnings.push({ service: 'strava', expired: true })
    } else if (hoursUntilExpiry <= 48) {
      warnings.push({ service: 'strava', expired: false, hoursUntilExpiry: Math.ceil(hoursUntilExpiry) })
    }
  }

  // Linear: check for recent TOKEN_REVOKED or 401 errors
  if (linearConnected) {
    const linearErrors = health?.linear ?? []
    const hasAuthError = linearErrors.some(
      (log) => log.error_code === 'TOKEN_REVOKED' || log.error_code === '401'
    )
    if (hasAuthError) {
      warnings.push({ service: 'linear', expired: true })
    }
  }

  return warnings
}
```

---

### 2. `IntegrationExpirationBanner.tsx`

```typescript
'use client'

import Link from 'next/link'
import { AlertTriangle, XCircle } from 'lucide-react'
import { useIntegrationExpirationWarning } from '@/hooks/useIntegrationExpirationWarning'

export function IntegrationExpirationBanner() {
  const warnings = useIntegrationExpirationWarning()

  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const label = w.service === 'strava' ? 'Strava' : 'Linear'

        const message = w.expired
          ? `${label}: connessione persa — Riautentica`
          : `${label}: il token scade in ${w.hoursUntilExpiry}h — Rinnova ora`

        const Icon = w.expired ? XCircle : AlertTriangle
        const colorClass = w.expired
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'

        return (
          <div
            key={w.service}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${colorClass}`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              <Icon size={14} className="shrink-0" />
              {message}
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              {w.expired ? 'Risolvi ora' : 'Rinnova ora'}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
```

---

### 3. Mount in `src/app/page.tsx`

The home page is already `'use client'`. Add import and mount the banner at the top of the content area, before the widgets grid:

```typescript
// Add import:
import { IntegrationExpirationBanner } from '@/components/ui/IntegrationExpirationBanner'

// Inside the returned JSX, add BEFORE the existing <div> with the widgets:
return (
  <div className="p-4 md:p-6 space-y-4 md:space-y-5">
    <div>
      <h1 className="text-xl font-bold text-white/90">Overview</h1>
      <p className="text-sm text-gray-500 mt-0.5">La tua settimana in sintesi</p>
    </div>

    {/* Token expiration warnings — non-blocking, auto-dismisses when resolved */}
    <IntegrationExpirationBanner />

    {isLoading ? (
      // ... existing loading skeleton
    ) : (
      // ... existing DndContext widgets grid
    )}
  </div>
)
```

---

### 4. Mount in `src/app/profile/page.tsx`

The profile page is a Server Component. `IntegrationExpirationBanner` is a Client Component (`'use client'`) — Next.js handles hydration automatically. Just add it after the `<h1>`.

```typescript
// Add import at top:
import { IntegrationExpirationBanner } from '@/components/ui/IntegrationExpirationBanner'

// Inside returned JSX, after <h1>:
return (
  <main className="flex-1 p-4 md:p-6">
    <h1 className="text-xl font-bold text-white mb-4">Profilo</h1>

    {/* Token expiration warnings */}
    <div className="mb-6 max-w-5xl">
      <IntegrationExpirationBanner />
    </div>

    <div className="space-y-6 max-w-5xl">
      {/* ... existing content unchanged */}
    </div>
  </main>
)
```

> Wrap in a `<div className="mb-6 max-w-5xl">` to match the `max-w-5xl` constraint of the rest of the profile layout.

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **No dismiss state needed** | Unlike `NotificationPermissionBanner` (which uses localStorage), this banner auto-dismisses when React Query cache updates (Strava token renewed → `expiresAt` updated; Linear error logs cleared after reconnect). No localStorage, no dismiss button. |
| **Only show for connected integrations** | Guard with `isConnected` check before computing warnings — don't show Strava warning if user never connected Strava |
| **Link to /profile, not /profile#anchor** | Profile has both `StravaIntegrationCard` and `LinearIntegrationCard` already visible at a reasonable scroll position — plain `/profile` link is sufficient |
| **`'use client'` for both new files** | Both hook and component use client-only hooks (`useQuery`, `useState` via `useIntegrationHealth`) |
| **TypeScript strict** | No `any`. `ExpirationWarning[]` typed explicitly. `hoursUntilExpiry` is `number | undefined` — only defined for `expired: false` strava warnings |
| **Immutability** | `warnings` array built from `const warnings: ExpirationWarning[] = []` + `.push()` within the function body — this is a local computation, not mutating any React state |
| **No overflow-hidden on banner container** | Banner has no Select/dropdown — no overflow issue, but still avoid unnecessary overflow-hidden on parent |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| Using `useEffect` + `useState` for expiry calculation | Compute directly in the hook body (pure derivation from query data) — no side effects needed |
| Showing Strava expiry warning when Strava not connected | Guard: `if (stravaConnected && expiresAt)` before computing |
| Using `Math.floor(hoursUntilExpiry)` → shows "0h" for tokens expiring in < 1h | Use `Math.ceil(hoursUntilExpiry)` so "1h" shows instead of "0h" |
| Duplicating `useIntegrationHealth()` calls in hook + component | Hook calls it once, component only calls `useIntegrationExpirationWarning()` — no duplication |
| Mounting banner inside the widgets grid | Mount OUTSIDE and ABOVE the DndContext/SortableContext — avoids re-render conflicts with drag events |
| Checking `log.error_message.includes('401')` | Check `log.error_code === '401'` or `'TOKEN_REVOKED'` — don't parse error messages, use codes |

---

## Learnings from Stories 1.1–1.5

- **`useStravaConnection()` returns `expiresAt`:** Already present in the hook — no API changes needed. The Strava `status` route returns `expires_at` from `strava_tokens` table.
- **`error_code` on integration logs:** Story 1.5 establishes `'TOKEN_REVOKED'` as the standard code for revoked tokens. Story 1.6 checks this exact string.
- **Linear has no OAuth token expiry:** Linear API keys are permanent unless revoked. The "Linear expiry" scenario maps to API key revocation detected via error logs.
- **Server + Client component mixing in profile:** Profile page is `async` server component — importing a `'use client'` component works natively in Next.js App Router. No wrappers needed.
- **Module color for warnings about integrations:** The banner uses red/amber (severity colors) not module colors, since it's a cross-cutting warning UI.

---

## File Change Summary

| Action | File |
|---|---|
| **CREATE** | `src/hooks/useIntegrationExpirationWarning.ts` — warning state computation |
| **CREATE** | `src/components/ui/IntegrationExpirationBanner.tsx` — banner UI |
| **MODIFY** | `src/app/page.tsx` — mount banner before widgets grid |
| **MODIFY** | `src/app/profile/page.tsx` — mount banner after h1 |

No migrations. No API routes. No npm dependencies.

---

## Definition of Done

- [ ] `IntegrationExpirationBanner` renders nothing when all tokens are valid and no errors exist
- [ ] When `expiresAt` is within 48h for Strava: amber banner shows "Strava: il token scade in Xh — Rinnova ora" with link to /profile
- [ ] When `expiresAt` is in the past for Strava: red banner shows "Strava: connessione persa — Riautentica" with "Risolvi ora" link
- [ ] When Linear has a recent error log with `error_code === 'TOKEN_REVOKED'` or `'401'`: red banner shows "Linear: connessione persa — Riautentica"
- [ ] Banner is NOT shown if Strava/Linear is not connected (user never set it up)
- [ ] Banner appears on both home (`/`) and profile (`/profile`) pages
- [ ] Banner auto-disappears after token renewal (React Query cache refresh)
- [ ] Clicking the link navigates to /profile
- [ ] No TypeScript errors (`npx tsc --noEmit` clean)
- [ ] Banner does not interfere with DnD widgets (mounted outside DndContext)

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
