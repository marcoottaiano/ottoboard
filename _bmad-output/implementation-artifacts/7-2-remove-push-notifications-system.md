# Story 7.2: Remove Push Notifications System

Status: ready-for-dev

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

- [ ] Task 1 — Database migration (AC: 2)
  - [ ] Create new migration file `supabase/migrations/<timestamp>_remove_push_notifications.sql`
  - [ ] `DROP TABLE IF EXISTS push_subscriptions CASCADE`
  - [ ] `ALTER TABLE reminders DROP COLUMN IF EXISTS notified_at`
  - [ ] Execute migration on Supabase BEFORE removing code (DB must be cleaned first)

- [ ] Task 2 — Remove dependencies (AC: 1, 5)
  - [ ] In `package.json`: remove `"web-push": "^3.6.7"` from dependencies
  - [ ] In `package.json`: remove `"@types/web-push": "^3.6.4"` from devDependencies
  - [ ] Run `npm install` to update lockfile

- [ ] Task 3 — Remove environment variables (AC: 5)
  - [ ] In `.env.local`: delete lines for `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  - [ ] On Vercel dashboard: remove the same 3 env vars from project settings (manual step — note for Marco)

- [ ] Task 4 — Edit `vercel.json` (AC: 5)
  - [ ] Remove the cron entry `{ "path": "/api/notifications/cron", "schedule": "0 7 * * *" }`
  - [ ] Keep the Strava cron entry `{ "path": "/api/strava/cron-token-refresh", "schedule": "0 2 * * *" }`

- [ ] Task 5 — Edit `next.config.mjs` (AC: 1)
  - [ ] Remove the line `swSrc: "src/sw.ts"` from the `withPWAInit({...})` config object
  - [ ] Do NOT remove `@ducanh2912/next-pwa` — PWA install/offline still works without a custom SW

- [ ] Task 6 — Delete files (AC: 1, 3, 4)
  - [ ] Delete `src/sw.ts` (push + notificationclick handlers)
  - [ ] Delete entire folder `src/app/api/notifications/` (3 files: subscribe/route.ts, status/route.ts, cron/route.ts)
  - [ ] Delete `src/hooks/useNotificationPermission.ts`
  - [ ] Delete `src/components/home/NotificationPermissionBanner.tsx`
  - [ ] Delete `src/components/profile/NotificationsCard.tsx`

- [ ] Task 7 — Edit `src/app/page.tsx` (home) (AC: 3)
  - [ ] Remove import of `NotificationPermissionBanner`
  - [ ] Remove `<NotificationPermissionBanner />` from JSX (rendered after widget list)

- [ ] Task 8 — Edit `src/app/profile/page.tsx` (AC: 4)
  - [ ] Remove import of `NotificationsCard`
  - [ ] Remove `<NotificationsCard />` from JSX (and its section wrapper if any)

- [ ] Task 9 — Clean up old migration files (AC: 2)
  - [ ] Delete `supabase/migrations/20260320170000_push_subscriptions_rls.sql` (8 lines, now obsolete)
  - [ ] Delete or clear `supabase/migrations/20260321000000_push_subscriptions_and_reminders_notified_at.sql` (the new Task 1 migration supersedes it)

- [ ] Task 10 — Update generated Supabase types (AC: 2)
  - [ ] After running DB migration, regenerate types: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts`
  - [ ] Verify `push_subscriptions` table and `reminders.notified_at` are absent from generated types
  - [ ] Fix any TypeScript errors caused by removed types

- [ ] Task 11 — Build verification (AC: 1–5)
  - [ ] Run `npm run build` and resolve all errors
  - [ ] Verify no remaining references to `useNotificationPermission`, `NotificationPermissionBanner`, `push_subscriptions`, `notified_at`, `VAPID` in `src/`

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

### Completion Notes List

### File List
