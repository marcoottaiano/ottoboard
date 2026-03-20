# Story 2.2: Scheduled Push Notification Delivery

Status: ready-for-dev

## Story

As a user,
I want to receive a push notification when a reminder is due (even with the app closed),
So that I never miss a scheduled reminder.

## Acceptance Criteria

1. **Given** a reminder has `due_date` of today and a `due_time` set
   **When** the Vercel Cron job runs at the top of each hour
   **Then** reminders with `due_time` within the next 60 minutes, `notified_at IS NULL`, and `completed = false` are queried
   **And** a push notification is sent to all active subscriptions for the user

2. **Given** the push notification is sent successfully
   **When** the delivery is confirmed
   **Then** `reminders.notified_at` is updated to `NOW()` to prevent duplicate sends

3. **Given** a reminder has `due_time = NULL`
   **When** the cron runs at 9:00 AM on the `due_date`
   **Then** the push notification is delivered at 9:00 AM

4. **Given** a push subscription returns a 410 Gone response
   **When** the send is attempted
   **Then** the subscription record is automatically deleted from `push_subscriptions`

## Tasks / Subtasks

- [ ] Add `reminders.notified_at` column via migration if not yet present (AC: 2)
  - [ ] Check if column exists: query `information_schema.columns` or run `supabase db diff`
  - [ ] If missing: create `supabase/migrations/<timestamp>_reminders_notified_at.sql`
- [ ] Fix `src/app/api/notifications/cron/route.ts` query logic to match AC (AC: 1, 2, 3)
  - [ ] Replace current `lte('due_date', today)` single-query approach with two-bucket logic
  - [ ] Bucket A (due_time set): `due_date = today AND due_time >= NOW() AND due_time < NOW() + 1h AND notified_at IS NULL AND completed = false`
  - [ ] Bucket B (due_time null): `due_date = today AND due_time IS NULL AND notified_at IS NULL AND completed = false` — only send if current UTC hour = 9 (or configured hour)
  - [ ] Bucket C (overdue): `due_date < today AND notified_at IS NULL AND completed = false` — send regardless of time
  - [ ] Confirm 410 handling deletes subscription row ✅ (already implemented)
  - [ ] Confirm batch `notified_at` update ✅ (already implemented)
- [ ] Update `vercel.json` cron schedule from `0 7 * * *` → `0 * * * *` (AC: 1, 3)
- [ ] Verify cron auth env var alignment (`PUSH_NOTIFICATIONS_SECRET` vs Vercel `CRON_SECRET`)

## Dev Notes

### ⚠️ CRITICAL: Cron Route Already Exists — Audit Before Editing

`src/app/api/notifications/cron/route.ts` **already exists** with partial implementation. Do NOT rewrite from scratch — audit and fix the delta.

**Current implementation summary:**
```typescript
// Current query (too broad — fetches ALL due today/overdue regardless of due_time)
.from('reminders')
.select('id, user_id, title, due_date')
.lte('due_date', today)          // overdue + today
.eq('completed', false)
.is('notified_at', null)
// ❌ Missing: due_time window filtering for hourly cron
// ❌ Missing: due_time=NULL only at 9AM logic
```

**Current vercel.json cron:** `"0 7 * * *"` (7 AM daily) → must change to `"0 * * * *"` (hourly)

### Correct Cron Query Logic

Replace the single query with three buckets OR equivalent SQL filter:

```typescript
const now = new Date()
const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`
const currentHour = now.getUTCHours()

// Bucket A: reminders WITH due_time, due within this hour
// Supabase .filter() with gte/lt on time column
// e.g. due_time >= HH:00:00 AND due_time < HH+1:00:00

// Bucket B: reminders WITHOUT due_time, today, send at 9 AM UTC
const sendNullTime = currentHour === 9  // 9 AM UTC

// Bucket C: overdue (due_date < today), any notified_at IS NULL
```

**Important timezone note:** The cron runs on Vercel servers in UTC. If the user is in UTC+1 (CET), "9 AM local" = 8 AM UTC. Choose a fixed UTC hour and document it. Keep it simple: send `due_time=NULL` reminders at `currentHour === 7` (UTC), which is 9 AM CET/8 AM UTC+1... actually use `7` UTC to hit ~9 AM in Italy (UTC+1 winter). Document the choice in a comment.

**Simplest correct approach** (avoids complex time zone math):
```typescript
// Normalize: work in UTC throughout
// due_time=NULL → send when currentHour === NOTIFY_HOUR_UTC (default: 7 = 9AM CET)
// due_time set → send in the hour window matching due_time (treat due_time as UTC)
```

### `reminders.notified_at` Column

This column is referenced in the existing cron route. It may have been created directly in Supabase (not via migration file). Verify with:
```bash
supabase db diff  # or check Supabase dashboard Table Editor
```

If missing, migration SQL:
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_reminders_notified_at.sql
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
```

Use `IF NOT EXISTS` to be idempotent. No RLS change needed — `notified_at` is updated only via admin client (cron route bypasses RLS).

### Auth: `PUSH_NOTIFICATIONS_SECRET` vs Vercel `CRON_SECRET`

The existing cron route checks:
```typescript
const secret = process.env.PUSH_NOTIFICATIONS_SECRET
if (authHeader !== `Bearer ${secret}`) return 401
```

Vercel Cron automatically adds `Authorization: Bearer {CRON_SECRET}` to scheduled requests. To align:

**Option A** (simplest): Set `PUSH_NOTIFICATIONS_SECRET` = same value as `CRON_SECRET` in Vercel env vars. No code change needed.

**Option B**: Change the route to use `process.env.CRON_SECRET`. Requires updating the env var name.

**Recommendation:** Option A — zero code change, add a comment documenting the alignment.

### `web-push` Library

Already installed and used in the existing route. VAPID setup already in place:
```typescript
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
```
These env vars must exist in Vercel. No library changes needed.

### `push_subscriptions` Column: `auth_key` vs `auth`

The existing route stores `auth_key` (not `auth`) in the DB:
```typescript
// subscribe/route.ts — saved as auth_key
{ user_id, endpoint, p256dh, auth_key: subscription.keys.auth }

// cron/route.ts — reads as auth_key
.select('endpoint, p256dh, auth_key')
const pushSub = { endpoint, keys: { p256dh, auth: sub.auth_key } }
```
This mismatch between DB column name (`auth_key`) and web-push field (`auth`) is already handled correctly by the existing code. Do NOT change this mapping.

### Architecture Compliance

- `api/notifications/cron` uses `lib/supabase/admin.ts` (service role) — correct, bypasses RLS for cross-user ops
- `lib/supabase/admin.ts` must never be imported in client components
- No new files needed: edit only `cron/route.ts` and `vercel.json`, possible migration

### Previous Story Context (2.1)

Story 2.1 delivered:
- `NotificationPermissionBanner` + `push_subscriptions` RLS verified
- Subscriptions are saved to `push_subscriptions` table with `user_id`, `endpoint`, `p256dh`, `auth_key`
- The `useNotificationPermission` hook handles the client-side subscription lifecycle

### Project Structure Notes

Files to modify:
- `src/app/api/notifications/cron/route.ts` — fix query logic for hourly filtering
- `vercel.json` — update cron schedule
- Possible: `supabase/migrations/<timestamp>_reminders_notified_at.sql`

No new files, no new components.

### References

- [Source: CLAUDE.md#Fase 11 — Notifiche Push] — cron spec: "ogni ora, es. alle :00 e :30", due_time NULL → 9:00 AM
- [Source: src/app/api/notifications/cron/route.ts] — existing implementation to audit
- [Source: vercel.json] — current cron schedule `0 7 * * *` must become `0 * * * *`
- [Source: CLAUDE.md#Gotcha Tecnici] — `toISOString().slice(0,10)` UTC shift bug — use UTC methods consistently in cron
- [Source: architecture.md#Service Boundaries] — admin client for cron ops

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
