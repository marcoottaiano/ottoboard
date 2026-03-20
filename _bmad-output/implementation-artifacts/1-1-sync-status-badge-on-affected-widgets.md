# Story 1.1: Sync Status Badge on Affected Widgets

**Epic:** 1 — Trusted Data — Integration Health & Sync Reliability
**Story ID:** 1.1
**Story Key:** `1-1-sync-status-badge-on-affected-widgets`
**Status:** done
**Created:** 2026-03-20

---

## User Story

As a user,
I want to see the sync status (live / stale) directly on the `KanbanColumnWidget` and `LastActivityCard` widgets on the home dashboard,
So that I can immediately understand whether the displayed data is current without navigating to /profile.

---

## Acceptance Criteria

**Given** the `KanbanColumnWidget` or `LastActivityCard` is rendered on the home dashboard
**When** the last successful sync occurred more than 30 minutes ago or the last sync returned an error
**Then** a `SyncStatusBadge` is displayed on the widget showing "Stale — last sync Xh ago" or an error icon
**And** when the data is fresh (synced within 30 minutes), the badge shows a subtle "Live" indicator or is hidden

**Given** an external API (Linear or Strava) is offline or returns an error during background sync
**When** the widget renders
**Then** a `SyncStatusBadge` with error state is visible on the affected widget
**And** the cached data is displayed normally without blocking the UI

---

## Context for the Dev Agent

### What This Story Does

Adds a `SyncStatusBadge` UI component (new) and integrates it into two existing home widgets:
- `KanbanColumnWidget` → reads Linear last sync timestamp
- `LastActivityCard` → reads Strava last sync timestamp

The badge is a small, non-blocking indicator that lives in the widget header area. It communicates data freshness at a glance — a key UX requirement ("trust through transparency").

### What Already Exists (DO NOT REINVENT)

| Existing Item | File | What It Provides |
|---|---|---|
| `useLinearConnection()` | `src/hooks/useLinearConnection.ts` | Returns `lastSyncedAt: string \| undefined` — already fetched from `/api/linear/status` |
| `useStravaConnection()` | `src/hooks/useStravaConnection.ts` | Returns `lastSyncedAt: string \| undefined` — already fetched from `/api/strava/status` |
| `KanbanColumnWidget` | `src/components/home/KanbanColumnWidget.tsx` | Must be extended (do not recreate) |
| `LastActivityCard` | `src/components/fitness/LastActivityCard.tsx` | Must be extended (do not recreate) |
| `GlobalLoadingBar` | `src/components/ui/GlobalLoadingBar.tsx` | Already handles background fetch indicator — do NOT add a second global indicator |

### What Must Be Created

| New Item | File | Notes |
|---|---|---|
| `SyncStatusBadge` | `src/components/ui/SyncStatusBadge.tsx` | Shared component in `ui/` — used by both fitness and home modules |

---

## Technical Implementation

### 1. Create `SyncStatusBadge` component

**File:** `src/components/ui/SyncStatusBadge.tsx`

**Props:**
```typescript
interface SyncStatusBadgeProps {
  lastSyncedAt: string | null | undefined
  hasError?: boolean
}
```

**Logic:**
- `lastSyncedAt` is undefined/null AND `hasError` is false → render nothing (no badge until first sync)
- `hasError === true` → error state (red icon + "Sync error")
- `lastSyncedAt` is within 30 minutes of `Date.now()` → live state (green dot + "Live") — or optionally hidden
- `lastSyncedAt` is older than 30 minutes → stale state (amber/yellow + "Stale — last sync Xh ago" or "Xm ago")

**Time formatting helper:**
```typescript
function formatStaleness(lastSyncedAt: string): string {
  const diffMs = Date.now() - new Date(lastSyncedAt).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin}m fa`
  const diffH = Math.floor(diffMin / 60)
  return `${diffH}h fa`
}
```
> ⚠️ Use `Date.now()` and `new Date(isoString).getTime()` — NOT `toLocalDateStr()` (which is for date-only strings, not timestamps).

**Visual design (dark theme, glassmorphism system):**
```tsx
// Live state
<span className="inline-flex items-center gap-1 text-xs text-green-400/80">
  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
  Live
</span>

// Stale state
<span className="inline-flex items-center gap-1 text-xs text-amber-400/80">
  <Clock size={10} />
  {label} // e.g. "42m fa"
</span>

// Error state
<span className="inline-flex items-center gap-1 text-xs text-red-400/80">
  <WifiOff size={10} />
  Sync error
</span>
```
Import `Clock`, `WifiOff` from `lucide-react` (already in dependencies).

---

### 2. Update `KanbanColumnWidget.tsx`

**File:** `src/components/home/KanbanColumnWidget.tsx`

**Changes:**
1. Import `useLinearConnection` from `@/hooks/useLinearConnection`
2. Import `SyncStatusBadge` from `@/components/ui/SyncStatusBadge`
3. Call `const { lastSyncedAt } = useLinearConnection()` inside the component
4. Add `<SyncStatusBadge lastSyncedAt={lastSyncedAt} />` in the widget header row (after the column name)

**Position in header (after existing breadcrumb):**
```tsx
<div className="flex items-center justify-between gap-1.5 min-w-0">
  <div className="flex items-center gap-1.5 min-w-0">
    <ColorDot color={project?.color ?? null} size="sm" />
    <span className="text-xs text-gray-500 truncate">{project?.name ?? '—'}</span>
    <span className="text-gray-700 text-xs">/</span>
    <span className="text-xs text-gray-300 font-medium truncate">{column?.name ?? '—'}</span>
  </div>
  <SyncStatusBadge lastSyncedAt={lastSyncedAt} />
</div>
```

> Note: `useLinearConnection()` adds one more query (`/api/linear/status`) per widget mount. This is fine — React Query deduplicates identical queryKeys, so if the user has multiple KanbanColumnWidgets on the home, only one fetch fires.

---

### 3. Update `LastActivityCard.tsx`

**File:** `src/components/fitness/LastActivityCard.tsx`

**Changes:**
1. Import `useStravaConnection` from `@/hooks/useStravaConnection`
2. Import `SyncStatusBadge` from `@/components/ui/SyncStatusBadge`
3. Call `const { lastSyncedAt } = useStravaConnection()` inside the component
4. Add `<SyncStatusBadge lastSyncedAt={lastSyncedAt} />` in the header row alongside the existing activity badge + date

**Position in header (alongside existing badge):**
```tsx
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2">
    <ActivityBadge type={activity.type} />
    <span className="text-xs text-gray-500">{formatDate(activity.start_date)}</span>
  </div>
  <SyncStatusBadge lastSyncedAt={lastSyncedAt} />
</div>
```

---

## Architecture Rules to Follow

| Rule | Detail |
|---|---|
| **No query in component** | `useLinearConnection()` and `useStravaConnection()` are hooks — already correct pattern. DO NOT call `fetch()` directly in the component. |
| **TypeScript strict** | No `any`. `lastSyncedAt` can be `string \| undefined \| null` — handle all three. |
| **Immutable data** | Do not mutate `lastSyncedAt`. Compute derived values (stale/live) locally. |
| **No new color families** | Use only `green-400`, `amber-400`, `red-400` for badge states — these are neutral status colors, not module colors. |
| **Module colors for modules** | `KanbanColumnWidget` is home context (slate); `LastActivityCard` is fitness (orange). The badge itself is status-neutral. |
| **`bg-white/5` for cards** | The `SyncStatusBadge` is inline text — no card wrapper needed. |
| **lucide-react icons** | Use `Clock` and `WifiOff` from lucide-react (already installed). |
| **`components/ui/`** | `SyncStatusBadge` goes in `src/components/ui/` because it is reused across modules (home and fitness). |

---

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct |
|---|---|
| `new Date().toISOString().slice(0,10)` for staleness | Use `Date.now() - new Date(ts).getTime()` for millisecond diff |
| Create a new `useSyncStatus` hook | Use existing `useLinearConnection` / `useStravaConnection` directly |
| Add `overflow-hidden` to badge container | Just `inline-flex` — no container issues |
| `upsert` for anything | n/a for this story (read-only display) |
| Add badge to `WidgetShell` globally | Per-widget — different data sources (Linear vs Strava) |
| Spinner/loading state inside `SyncStatusBadge` | Render `null` while `lastSyncedAt` is undefined (not loaded yet) |

---

## File Change Summary

| Action | File |
|---|---|
| **CREATE** | `src/components/ui/SyncStatusBadge.tsx` |
| **MODIFY** | `src/components/home/KanbanColumnWidget.tsx` |
| **MODIFY** | `src/components/fitness/LastActivityCard.tsx` |

No DB migrations, no API changes, no Edge Function changes required for this story.

---

## Definition of Done

- [x] `SyncStatusBadge` renders correctly in all 3 states: live (< 30min), stale (>= 30min), error
- [x] `KanbanColumnWidget` shows badge in header; badge reflects `lastSyncedAt` from `useLinearConnection()`
- [x] `LastActivityCard` shows badge in header; badge reflects `lastSyncedAt` from `useStravaConnection()`
- [x] When `lastSyncedAt` is `null`/`undefined` and no error: badge is not rendered (no layout shift)
- [x] No TypeScript errors (`strict: true`)
- [x] Badge does not block/cover existing widget content
- [x] React Query deduplication confirmed: multiple widgets on same page → single `/api/linear/status` fetch

---

## File List

- `src/components/ui/SyncStatusBadge.tsx` (created)
- `src/components/home/KanbanColumnWidget.tsx` (modified)
- `src/components/fitness/LastActivityCard.tsx` (modified)

---

## Dev Agent Record

### Implementation Plan

1. Created `SyncStatusBadge` in `src/components/ui/` — shared between home and fitness modules.
2. Used `Clock` and `WifiOff` from `lucide-react` (already installed, no new dependencies).
3. Time diff computed with `Date.now() - new Date(ts).getTime()` in milliseconds — avoids UTC/CET shift bug.
4. `SyncStatusBadge` renders `null` when `lastSyncedAt` is null/undefined and no error — no layout shift.
5. `shrink-0` on the badge wrapper prevents truncation when project/column names are long.
6. `KanbanColumnWidget`: header restructured to `justify-between` flex row; `useLinearConnection()` added (React Query deduplicates across multiple widgets).
7. `LastActivityCard`: header similarly restructured; `useStravaConnection()` added.

### Completion Notes

- ✅ TypeScript strict check: zero errors (`npx tsc --noEmit` clean)
- ✅ No new dependencies added
- ✅ No DB migrations, API routes, or Edge Functions needed
- ✅ React Query queryKey `['linear-status']` already deduplicated — single fetch regardless of widget count
- ✅ All 3 badge states implemented: live (green pulse dot), stale (amber clock + "Xm/h fa"), error (red WifiOff)

---

## Change Log

- 2026-03-20: Story implemented — created `SyncStatusBadge`, integrated into `KanbanColumnWidget` and `LastActivityCard`. TypeScript clean. Status → review.
- 2026-03-20: Post-review fixes applied — NaN guard, future timestamp clamp, day-level staleness (`g fa`), `hasError` wired from hook `isError`, duplicate `diffMs` eliminated, `useLinearConnection` disabled when widget unconfigured. Status → done.
