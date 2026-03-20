# Story 2.1: Push Notification Permission & Subscription

Status: ready-for-dev

## Story

As a user,
I want to be prompted to enable push notifications via a non-invasive banner on the home dashboard,
So that I can receive reminder notifications without navigating to the Profile settings.

## Acceptance Criteria

1. **Given** I have not yet granted push notification permission
   **When** I open the home dashboard
   **Then** a dismissible `NotificationPermissionBanner` appears with CTA "Attiva notifiche per i promemoria → Attiva"

2. **Given** I click "Attiva" on the banner
   **When** the browser permission dialog is shown and I grant permission
   **Then** the browser subscription is created and saved to `push_subscriptions` in Supabase
   **And** the banner disappears permanently

3. **Given** I dismiss the banner without granting permission
   **When** I return to the home dashboard in a future session
   **Then** the banner does NOT reappear (state persisted in `localStorage`)

4. **Given** the browser does not support Web Push API
   **When** I visit the home dashboard
   **Then** the `NotificationPermissionBanner` is not shown at all

## Tasks / Subtasks

- [ ] Create `src/components/home/NotificationPermissionBanner.tsx` (AC: 1, 2, 3, 4)
  - [ ] Use `useNotificationPermission` hook — hide banner if `!isSupported` or `isSubscribed`
  - [ ] Read `localStorage.getItem('notification-banner-dismissed')` — hide if `'true'`
  - [ ] Render compact banner with Bell icon, label, "Attiva" button, dismiss (×) button
  - [ ] On "Attiva": call `subscribe()` — banner auto-hides when `isSubscribed` becomes true
  - [ ] On dismiss (×): `localStorage.setItem('notification-banner-dismissed', 'true')` + hide immediately
  - [ ] Follow dark glassmorphism style: `bg-amber-500/10 border border-amber-500/20`
- [ ] Edit `src/app/page.tsx` to render `<NotificationPermissionBanner />` above the widget grid (AC: 1)
- [ ] Verify `push_subscriptions` RLS policy exists; create migration if missing (AC: 2)

## Dev Notes

### ⚠️ CRITICAL: These Files Already Exist — Do NOT Recreate

| File | What's in it |
|------|--------------|
| `src/sw.ts` | Push + notificationclick handlers — complete and working |
| `src/hooks/useNotificationPermission.ts` | Full subscribe/unsubscribe/status logic |
| `src/app/api/notifications/subscribe/route.ts` | POST (subscribe) + DELETE (unsubscribe) |
| `src/app/api/notifications/status/route.ts` | GET — checks `push_subscriptions` for user |
| `src/components/profile/NotificationsCard.tsx` | Profile manage section — do not touch |
| `next.config.mjs` | `swSrc: "src/sw.ts"` already configured, SW generated at build |
| `push_subscriptions` table | Exists in Supabase with `user_id DEFAULT auth.uid()` |
| `vercel.json` | Cron configured at `0 7 * * *` for `/api/notifications/cron` |

### Existing Hook API — `useNotificationPermission`

```typescript
// src/hooks/useNotificationPermission.ts
const {
  isSupported,     // false if browser lacks Push API or ServiceWorker — hide banner
  permission,      // 'default' | 'granted' | 'denied'
  isSubscribed,    // true if row exists in push_subscriptions for this user
  isLoading,       // true during /api/notifications/status fetch
  isSubscribing,   // true during subscribe() call
  subscribe,       // calls requestPermission + pushManager.subscribe + POST /api/notifications/subscribe
  unsubscribe,
} = useNotificationPermission()
```

`subscribe()` handles everything: permission request, SW subscription, Supabase save, toast feedback. No need to call any API directly from the banner.

### Banner Display Logic

```typescript
const DISMISSED_KEY = 'notification-banner-dismissed'

// Show banner when ALL conditions true:
const isDismissed = typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === 'true'
const shouldShow = isSupported && !isSubscribed && permission !== 'granted' && !isDismissed
// Note: isLoading → don't show yet (avoid flash)
```

Do NOT add a "has active reminders" check — the banner is small and dismissible; the UX complexity isn't worth the extra query.

### Banner Visual Design

Follow the style established by `NotificationsCard.tsx` (yellow/amber palette for notifications):

```tsx
// Compact strip, NOT a full-width modal/card
<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
  <Bell size={15} className="text-amber-400 shrink-0" />
  <span className="text-white/70 flex-1 text-xs">Attiva notifiche per i promemoria</span>
  <button onClick={subscribe} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors whitespace-nowrap">
    Attiva
  </button>
  <button onClick={handleDismiss} className="text-gray-600 hover:text-gray-400 transition-colors ml-1">
    <X size={14} />
  </button>
</div>
```

- Lucide icons: `Bell`, `X`
- Color: amber (matches `NotificationsCard` yellow — consistent notification visual identity)
- UX spec: non-invasive, dismissible, respects localStorage state
- [Source: ux-design-specification.md#Component Implementation Strategy] — follow `bg-white/5 border border-white/10 rounded-xl` pattern with module color

### Integration Point in `src/app/page.tsx`

```tsx
// Add import
import { NotificationPermissionBanner } from '@/components/home/NotificationPermissionBanner'

// In JSX, after the header div and before isLoading check:
export default function HomePage() {
  // ...
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div> {/* existing header */}
        <h1 className="text-xl font-bold text-white/90">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">La tua settimana in sintesi</p>
      </div>

      <NotificationPermissionBanner /> {/* ADD THIS LINE */}

      {isLoading ? ( /* existing loading skeleton */ ) : ( /* existing DndContext */ )}
    </div>
  )
}
```

### RLS Verification for `push_subscriptions`

The subscribe route uses `lib/supabase/server.ts` (auth session, RLS enforced). The cron uses `lib/supabase/admin.ts` (service role, bypasses RLS — intentional for server-side send).

Check if RLS is enabled with policy. If missing, create:

```sql
-- supabase/migrations/<timestamp>_push_subscriptions_rls.sql
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Migration naming convention: `YYYYMMDDHHMMSS_description.sql` — use current datetime as prefix.

### Project Structure Notes

- **New file**: `src/components/home/NotificationPermissionBanner.tsx`
  - `'use client'` component (uses hooks + localStorage)
  - Co-located with other home widget components (`RemindersWidget.tsx`, `WidgetShell.tsx`)
- **Edit**: `src/app/page.tsx` — add 1 import + 1 JSX element
- **Possible migration**: only if `push_subscriptions` has no RLS policy

### Architecture Rules (from architecture.md)

- `components/home/` imports only from `components/ui/` and `hooks/` — never cross-module
- Logic stays in hooks, not components — use `useNotificationPermission` as-is
- `'use client'` required (browser APIs: `localStorage`, `Notification.permission`)
- Implementation sequence: check schema/RLS first, then component, then integration

### References

- [Source: CLAUDE.md#Fase 11 — Notifiche Push] — full spec including localStorage persist behavior
- [Source: src/hooks/useNotificationPermission.ts] — existing hook interface
- [Source: src/components/profile/NotificationsCard.tsx] — visual/color reference
- [Source: src/app/page.tsx] — exact integration point (render after header `<div>`)
- [Source: ux-design-specification.md#Priority 3] — "dismissible, respects localStorage state"
- [Source: architecture.md#Component Boundaries] — `components/home/` isolation rules

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
