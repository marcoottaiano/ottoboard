# Story 7.2: Remove Push Notifications System

Status: review

## Story

As a developer maintaining Ottoboard,
I want to remove the entire push notifications subsystem,
So that there is no dead service worker code, no unused DB table, and no broken permission UI.

## Acceptance Criteria

1. **Given** the custom service worker **When** the app loads **Then** no `push` event handler is registered **And** no `notificationclick` handler is registered.
2. **Given** the database **When** the cleanup migration runs **Then** table `push_subscriptions` is dropped **And** column `notified_at` is removed from `reminders`.
3. **Given** the home dashboard **When** the user has reminder widgets active **Then** no `NotificationPermissionBanner` is rendered anywhere.
4. **Given** the Profile page **When** the user visits `/profile` **Then** no "Notifiche" section exists **And** `useNotificationPermission` hook is deleted from codebase.
5. **Given** Vercel configuration **When** reviewing `vercel.json` **Then** the `/api/notifications/cron` cron entry is absent **And** VAPID vars are no longer referenced in code.

## Tasks / Subtasks

- [x] Task 1 — Database migration (AC: 2)
  - [x] Create new migration file `supabase/migrations/<timestamp>_remove_push_notifications.sql`
  - [x] `DROP TABLE IF EXISTS push_subscriptions CASCADE`
  - [x] `ALTER TABLE reminders DROP COLUMN IF EXISTS notified_at`
  - [x] Execute migration on Supabase BEFORE removing code (DB must be cleaned first)

- [x] Task 2 — Remove dependencies (AC: 1, 5)
  - [x] In `package.json`: remove `"web-push": "^3.6.7"` from dependencies
  - [x] In `package.json`: remove `"@types/web-push": "^3.6.4"` from devDependencies
  - [x] Run `npm install` to update lockfile

- [x] Task 3 — Remove environment variables (AC: 5)
  - [x] In `.env.local`: delete lines for `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  - [x] On Vercel dashboard: remove the same 3 env vars from project settings (manual step — note for Marco)

- [x] Task 4 — Edit `vercel.json` (AC: 5)
  - [x] Remove the cron entry `{ "path": "/api/notifications/cron", "schedule": "0 7 * * *" }`
  - [x] Keep the Strava cron entry `{ "path": "/api/strava/cron-token-refresh", "schedule": "0 2 * * *" }`

- [x] Task 5 — Edit `next.config.mjs` (AC: 1)
  - [x] Remove the line `swSrc: "src/sw.ts"` from the `withPWAInit({...})` config object
  - [x] Do NOT remove `@ducanh2912/next-pwa` — PWA install/offline still works without a custom SW

- [x] Task 6 — Delete files (AC: 1, 3, 4)
  - [x] Delete `src/sw.ts` (push + notificationclick handlers)
  - [x] Delete entire folder `src/app/api/notifications/` (3 files: subscribe/route.ts, status/route.ts, cron/route.ts)
  - [x] Delete `src/hooks/useNotificationPermission.ts`
  - [x] Delete `src/components/home/NotificationPermissionBanner.tsx`
  - [x] Delete `src/components/profile/NotificationsCard.tsx`

- [x] Task 7 — Edit `src/app/page.tsx` (home) (AC: 3)
  - [x] Remove import of `NotificationPermissionBanner`
  - [x] Remove `<NotificationPermissionBanner />` from JSX (rendered after widget list)

- [x] Task 8 — Edit `src/app/profile/page.tsx` (AC: 4)
  - [x] Remove import of `NotificationsCard`
  - [x] Remove `<NotificationsCard />` from JSX (and its section wrapper if any)

- [x] Task 9 — Clean up old migration files (AC: 2)
  - [x] Delete `supabase/migrations/20260320170000_push_subscriptions_rls.sql` (8 lines, now obsolete)
  - [x] Delete or clear `supabase/migrations/20260321000000_push_subscriptions_and_reminders_notified_at.sql` (the new Task 1 migration supersedes it)

- [x] Task 10 — Update generated Supabase types (AC: 2)
  - [x] After running DB migration, regenerate types: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts`
  - [x] Verify `push_subscriptions` table and `reminders.notified_at` are absent from generated types
  - [x] Fix any TypeScript errors caused by removed types

- [x] Task 11 — Build verification (AC: 1–5)
  - [x] Run `npm run build` and resolve all errors
  - [x] Verify no remaining references to `useNotificationPermission`, `NotificationPermissionBanner`, `push_subscriptions`, `notified_at`, `VAPID` in `src/`

## Dev Notes

### CRITICAL ORDER: DB First, then Code
**Always run the Supabase migration BEFORE removing TypeScript code.** If code referencing `notified_at` is removed first, the DB column is harmlessly orphaned. If the migration is run after code removal, no problem either — but the DB must be clean before declaring the story done.

### What to KEEP (Critical)
- `@ducanh2912/next-pwa` package and `next.config.mjs` PWA config (minus `swSrc`) — PWA install/offline feature is unrelated to push
- `src/app/api/strava/cron-token-refresh/route.ts` — completely unrelated
- Strava cron in `vercel.json` — keep untouched
- `RemindersWidget`, `useReminders`, `ReminderCreateModal`, `ReminderEditModal` — reminders themselves stay, only the PUSH delivery layer is removed
- `reminders` table itself — only `notified_at` column is dropped

### Reminders Module Integrity
The Reminders system (CRUD, display, completion, recurrence) lives in:
- `src/components/home/RemindersWidget.tsx`
- `src/hooks/useReminders.ts`
- `src/app/api/reminders/` (if exists)

None of these are touched. Only the push delivery channel is removed. After this story, reminders work as before — users just won't get push notifications.

### next.config.mjs After Edit
```javascript
const withPWA = withPWAInit({
  dest: "public",
  // swSrc removed — no custom service worker
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== "production",
  workboxOptions: {
    disableDevLogs: true,
  },
});
```

### vercel.json After Edit
```json
{
  "crons": [
    {
      "path": "/api/strava/cron-token-refresh",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Supabase Types Regeneration
After dropping `push_subscriptions` and `reminders.notified_at`, regenerate types to avoid stale type errors. Check `src/lib/supabase/types.ts` for `Database['public']['Tables']['push_subscriptions']` and remove manually if auto-gen is not available.

### Migration SQL Template
```sql
-- Remove push notifications system (Story 7.2)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
ALTER TABLE reminders DROP COLUMN IF EXISTS notified_at;
```

### Manual Step Required (Vercel)
Removing VAPID env vars from `.env.local` only affects local dev. Marco must also delete them from the Vercel project dashboard under Settings > Environment Variables.

### Project Structure Notes
- Service worker source: `src/sw.ts` (compiled to `public/sw.js` by next-pwa at build time)
- next-pwa config: `next.config.mjs`
- API routes: `src/app/api/notifications/`
- Hooks: `src/hooks/`
- Profile components: `src/components/profile/`
- Home components: `src/components/home/`

### References
- Epic 7 story spec: `_bmad-output/planning_artifacts/epics.md` — Story 7.2
- CLAUDE.md — Fase 11 (Push Notifications architecture)
- CLAUDE.md — Fase 8 (PWA setup — keep untouched)
- `vercel.json` current: has 2 crons, remove only the notifications one

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. All tasks completed in one pass.

### Completion Notes List

- ✅ DB migration applied via Supabase MCP: `push_subscriptions` dropped, `reminders.notified_at` removed.
- ✅ `web-push` and `@types/web-push` removed from `package.json`, lockfile updated.
- ✅ VAPID env vars removed from `.env.local` (manual Vercel step noted for Marco).
- ✅ `vercel.json` now has only the Strava cron entry.
- ✅ `next.config.mjs` `swSrc` line removed; PWA remains functional.
- ✅ Deleted: `src/sw.ts`, `src/app/api/notifications/` (3 routes), `src/hooks/useNotificationPermission.ts`, `src/components/home/NotificationPermissionBanner.tsx`, `src/components/profile/NotificationsCard.tsx`.
- ✅ `src/app/page.tsx` cleaned: import + `<NotificationPermissionBanner />` removed.
- ✅ `src/app/profile/page.tsx` cleaned: import + `<NotificationsCard />` removed.
- ✅ Old migration files deleted: `20260320170000_push_subscriptions_rls.sql`, `20260321000000_push_subscriptions_and_reminders_notified_at.sql`.
- ✅ Types regenerated via Supabase MCP: `push_subscriptions` and `notified_at` absent from types.
- ✅ `npm run build` completed successfully with 0 errors.

### File List

- `supabase/migrations/20260325100000_remove_push_notifications.sql` (new)
- `supabase/migrations/20260320170000_push_subscriptions_rls.sql` (deleted)
- `supabase/migrations/20260321000000_push_subscriptions_and_reminders_notified_at.sql` (deleted)
- `package.json` (modified)
- `package-lock.json` (modified)
- `.env.local` (modified)
- `vercel.json` (modified)
- `next.config.mjs` (modified)
- `src/sw.ts` (deleted)
- `src/app/api/notifications/subscribe/route.ts` (deleted)
- `src/app/api/notifications/status/route.ts` (deleted)
- `src/app/api/notifications/cron/route.ts` (deleted)
- `src/hooks/useNotificationPermission.ts` (deleted)
- `src/components/home/NotificationPermissionBanner.tsx` (deleted)
- `src/components/profile/NotificationsCard.tsx` (deleted)
- `src/app/page.tsx` (modified)
- `src/app/profile/page.tsx` (modified)

### Change Log

- Removed push notifications system (Story 7.2) — Date: 2026-03-25
