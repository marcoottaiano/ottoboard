# Story 5.4: Data Isolation Verification — RLS

**Epic:** 5 — Beta User Self-Onboarding & Profile Management
**Story ID:** 5.4
**Story Key:** `5-4-data-isolation-verification-rls`
**Status:** done
**Created:** 2026-03-20

---

## User Story

As an application developer,
I want to verify that every user-owned table in Supabase has Row Level Security enabled with correct policies,
So that no authenticated user can ever read or modify another user's data, regardless of direct API access.

---

## Acceptance Criteria

**Given** I run the RLS audit SQL query
**When** the results are returned
**Then** every user-owned table shows `row_security = true` and at least one policy with `USING (auth.uid() = user_id)` or equivalent subquery

**Given** any table lacks RLS or has an incomplete policy
**When** the gap is identified
**Then** a Supabase migration is applied to enable RLS and create the correct policy with both `USING` and `WITH CHECK` clauses

**Given** all RLS policies are applied
**When** an authenticated user queries any table via the anon client
**Then** they receive only their own rows — rows belonging to other users are invisible (not an error, simply absent from results)

**Given** a table uses FK-based isolation (no direct `user_id` column)
**When** the policy is written
**Then** it uses a subquery: `USING (parent_id IN (SELECT id FROM parent_table WHERE user_id = auth.uid()))`

**Given** all migrations are applied
**When** `npm run build` is run
**Then** zero TypeScript errors (no code changes expected, only SQL migrations)

---

## Context for the Dev Agent

### What This Story Does

This is a **security audit + fix story**. There is no UI or application code to write. The entire deliverable is:

1. **Audit** — run SQL against Supabase to identify tables missing RLS or policies
2. **Fix** — apply Supabase migrations for any gaps found
3. **Document** — record verified state in this story's completion notes

Use the Supabase MCP tool (`execute_sql` + `apply_migration`) to perform all work directly against the database.

---

## Complete Table Inventory

### Group A — Direct `user_id` tables (simple RLS pattern)

These tables should all have:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON <table>
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

| Table | user_id DEFAULT? | Notes |
|-------|-----------------|-------|
| `activities` | required | Strava activities |
| `transactions` | required | Finance transactions |
| `categories` | required | User-owned (seeded in onboarding) |
| `projects` | required | Kanban projects |
| `dashboard_widgets` | required | Home widget config |
| `reminders` | required | Reminder items |
| `body_measurements` | required | Body tracking |
| `user_body_profile` | required | PK = user_id |
| `strava_tokens` | required | One row per user |
| `linear_tokens` | required | One row per user |
| `push_subscriptions` | required | One row per device |
| `integration_error_logs` | `DEFAULT auth.uid()` ✅ confirmed migration | Has policy confirmed |
| `habits` | required | Habit definitions |
| `habit_completions` | required | Each completion has user_id |
| `financial_goals` | required | Financial goals |
| `recurring_transactions` | required | Recurring entries |

### Group B — FK-based isolation (subquery RLS pattern)

These tables have **no `user_id` column** — access is controlled via the parent table:

| Table | FK Column | Parent Table | Subquery Pattern |
|-------|-----------|--------------|-----------------|
| `columns` | `project_id` | `projects` | `project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())` |
| `tasks` | `project_id` | `projects` | `project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())` |

### Group C — Investigate first

| Table | Risk | Action |
|-------|------|--------|
| `budgets` | TypeScript type has no `user_id` field — may rely solely on `categories` RLS | Audit: check if `user_id` column exists in DB. If not: add it OR add subquery policy via `category_id` |

---

## Step-by-Step Implementation

### Step 1 — Run RLS Audit Query

Execute this SQL via Supabase MCP `execute_sql`:

```sql
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COALESCE(
    json_agg(
      json_build_object(
        'policy_name', p.policyname,
        'cmd', p.cmd,
        'qual', p.qual,
        'with_check', p.with_check
      )
    ) FILTER (WHERE p.policyname IS NOT NULL),
    '[]'
  ) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

Analyze the results:
- `rls_enabled = false` → **BLOCKER**: RLS not enabled on this table
- `policies = []` with `rls_enabled = true` → **BLOCKER**: RLS enabled but no policy = all access blocked (worse: anon can still bypass if SECURITY DEFINER functions exist)
- Policy with missing `with_check` → **ISSUE**: INSERT/UPDATE not protected

### Step 2 — Check `user_id` DEFAULT on all Group A tables

Execute this SQL to check DEFAULT values:

```sql
SELECT
  c.table_name,
  c.column_name,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'user_id'
ORDER BY c.table_name;
```

Any table in Group A that is missing `DEFAULT auth.uid()` needs:
```sql
ALTER TABLE <table> ALTER COLUMN user_id SET DEFAULT auth.uid();
```

### Step 3 — Apply Fixes for Each Gap Found

#### Template: Fix for a Group A table missing RLS

File: `supabase/migrations/YYYYMMDDXXXXXX_rls_<table>.sql`

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_<table>"
ON <table>
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure DEFAULT prevents 403 on client-side INSERT
ALTER TABLE <table> ALTER COLUMN user_id SET DEFAULT auth.uid();
```

#### Fix for `columns` (Group B — no user_id):

```sql
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_columns"
ON columns
FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);
```

#### Fix for `tasks` (Group B — no user_id):

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tasks"
ON tasks
FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);
```

#### Fix for `budgets` — if no `user_id` column found:

**Option A** (preferred): add `user_id` column + simple policy:
```sql
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- Backfill existing rows via category owner
UPDATE budgets b
SET user_id = c.user_id
FROM categories c
WHERE b.category_id = c.id
  AND b.user_id IS NULL;

ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_budgets"
ON budgets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Option B** (if `user_id` already exists but no policy): just add the policy without the ALTER/UPDATE.

### Step 4 — Verify All Policies Applied

Re-run the audit query from Step 1. Confirm:
- All user-owned tables: `rls_enabled = true`
- All tables have at least one policy
- Group A tables: policy uses `auth.uid() = user_id`
- Group B tables: policy uses subquery via parent table

### Step 5 — Run Build Verification

```bash
npm run build
```

No TypeScript changes expected — this story is SQL-only. Build must pass with zero errors.

---

## Dev Notes

### RLS Gotchas from CLAUDE.md

From the project's documented RLS rules:
```sql
-- Policy da replicare su tutte le tabelle user-owned
CREATE POLICY "Users can only see their own data"
ON <table>
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);  -- WITH CHECK obbligatorio per INSERT/UPDATE

-- IMPORTANTE: la colonna user_id deve avere DEFAULT per evitare 403 su INSERT client-side
ALTER TABLE <table> ALTER COLUMN user_id SET DEFAULT auth.uid();
```

**Critical rules:**
- Always include `WITH CHECK` — without it, `UPDATE` sets `user_id = null` bypass
- Always set `DEFAULT auth.uid()` — without it, client-side INSERT fails with 403 (Supabase anon key sends `user_id = null` unless DEFAULT fills it)
- `upsert` with a subset of columns: if `user_id` has no DEFAULT, the upsert overwrites it with null → data leak

### Supabase RLS Does NOT Propagate Through FKs

A common misconception: if `projects` has RLS, that does NOT automatically protect `columns` or `tasks` referencing `projects.id`. Each table needs its own RLS policy. Without it, a user querying `columns` directly (e.g., via Supabase JS `.from('columns').select('*')`) receives ALL columns from ALL users.

### `integration_error_logs` is Already Protected

The migration `supabase/migrations/20260320000000_integration_error_logs.sql` has a confirmed policy. Skip this table if audit shows it's covered.

### `user_body_profile` — user_id IS the Primary Key

For this table, the RLS policy is:
```sql
USING (auth.uid() = user_id)
```
since `user_id` is the PK (UUID). There is only one row per user.

### `strava_tokens` and `linear_tokens` — One Row Per User

These tables store OAuth tokens. The service role (admin client) may need to bypass RLS to write tokens (done via `createAdminClient()`). The anon client reads via RLS for status checks. Both operations are correct by design.

### Migration File Naming

Use timestamp format: `YYYYMMDDHHMMSS_description.sql`, e.g.:
```
supabase/migrations/20260320120000_rls_columns_tasks.sql
supabase/migrations/20260320120001_rls_budgets.sql
```

Apply via Supabase MCP `apply_migration` tool, not manually.

### Realtime Tables

`tasks` table has Realtime enabled (from migration `20260320000001_realtime_tasks.sql`). Adding RLS to `tasks` does NOT disable Realtime — it filters the Realtime stream by the user's own rows automatically. No additional configuration needed.

### No Application Code Changes

This story produces **zero changes** to TypeScript/Next.js application code. All changes are SQL migrations applied to the Supabase database. The `npm run build` check is just a sanity assertion.

---

## Tasks

- [x] **Task 1**: Run RLS audit SQL query via Supabase MCP `execute_sql` — identify all tables missing RLS or policies
- [x] **Task 2**: Run `user_id` DEFAULT check via `execute_sql` — identify tables missing `DEFAULT auth.uid()`
- [x] **Task 3**: Investigate `budgets` table — determine if `user_id` column exists and policy is present
- [x] **Task 4**: Apply migrations for all identified gaps:
  - [x] 4a. Group A tables missing RLS/policy (if any) — all had RLS enabled; fixed `WITH CHECK` on 8 tables
  - [x] 4b. `columns` table — had `user_id` directly (not FK-based); fixed `WITH CHECK` + `DEFAULT`
  - [x] 4c. `tasks` table — had `user_id` directly (not FK-based); fixed `WITH CHECK` + `DEFAULT`
  - [x] 4d. `budgets` table — had `user_id` + policy; fixed `WITH CHECK` + `DEFAULT`
- [x] **Task 5**: Re-run audit query to confirm all gaps are resolved
- [x] **Task 6**: Run `npm run build` — confirm zero TypeScript errors
- [x] **Task 7**: Document verified table list in Completion Notes

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

_None — no blocking issues encountered._

### Completion Notes List

**RLS Audit Results (2026-03-20):**

All 19 user-owned tables in public schema were audited. Pre-existing state:
- ✅ All tables had `rls_enabled = true` — no table was fully unprotected
- ❌ 8 tables were missing `WITH CHECK` clause: `activities`, `budgets`, `categories`, `columns`, `projects`, `strava_tokens`, `tasks`, `transactions`
- ❌ 11 tables were missing `DEFAULT auth.uid()`: `activities`, `budgets`, `categories`, `columns`, `linear_tokens`, `projects`, `push_subscriptions`, `strava_tokens`, `tasks`, `transactions`, `user_body_profile`

**Note on `columns` and `tasks`:** The story assumed these tables had no `user_id` column and required FK-based subquery policies. In practice, both tables have a direct `user_id` column with a simple policy. The direct approach was retained (more efficient) and `WITH CHECK` was added.

**Note on `budgets`:** The story flagged this as "investigate first". The table has a `user_id` column with a direct policy — only needed `WITH CHECK` + `DEFAULT` (Option B).

**Migration applied:** `20260320120000_rls_fix_with_check_and_defaults.sql`
- 8 `ALTER POLICY` statements to add `WITH CHECK (auth.uid() = user_id)`
- 11 `ALTER TABLE ... SET DEFAULT auth.uid()` statements

**Post-migration state:** All 19 tables confirmed:
- `rls_enabled = true` ✅
- Policy with both `USING (auth.uid() = user_id)` AND `WITH CHECK (auth.uid() = user_id)` ✅
- `DEFAULT auth.uid()` on all `user_id` columns ✅

**Build:** `npm run build` — ✅ zero TypeScript errors (no application code changes, SQL-only story)

**Verified table list:**

| Table | RLS | Policy | WITH CHECK | DEFAULT auth.uid() |
|-------|-----|--------|------------|-------------------|
| `activities` | ✅ | `own_activities` | ✅ fixed | ✅ fixed |
| `body_measurements` | ✅ | `own measurements` | ✅ was ok | ✅ was ok |
| `budgets` | ✅ | `own_budgets` | ✅ fixed | ✅ fixed |
| `categories` | ✅ | `own_categories` | ✅ fixed | ✅ fixed |
| `columns` | ✅ | `own_columns` | ✅ fixed | ✅ fixed |
| `dashboard_widgets` | ✅ | `own_widgets` | ✅ was ok | ✅ was ok |
| `financial_goals` | ✅ | `Users can only see their own financial goals` | ✅ was ok | ✅ was ok |
| `habit_completions` | ✅ | `completions_user` | ✅ was ok | ✅ was ok |
| `habits` | ✅ | `habits_user` | ✅ was ok | ✅ was ok |
| `integration_error_logs` | ✅ | `Users can only see their own integration error logs` | ✅ was ok | ✅ was ok |
| `linear_tokens` | ✅ | `linear_tokens: own rows only` | ✅ was ok | ✅ fixed |
| `projects` | ✅ | `own_projects` | ✅ fixed | ✅ fixed |
| `push_subscriptions` | ✅ | `Users manage own subscription` | ✅ was ok | ✅ fixed |
| `recurring_transactions` | ✅ | `Users can only see their own recurring transactions` | ✅ was ok | ✅ was ok |
| `reminders` | ✅ | `reminders: own rows only` | ✅ was ok | ✅ was ok |
| `strava_tokens` | ✅ | `own_tokens` | ✅ fixed | ✅ fixed |
| `tasks` | ✅ | `own_tasks` | ✅ fixed | ✅ fixed |
| `transactions` | ✅ | `own_transactions` | ✅ fixed | ✅ fixed |
| `user_body_profile` | ✅ | `own profile` | ✅ was ok | ✅ fixed |

### File List

- `supabase/migrations/20260320120000_rls_fix_with_check_and_defaults.sql` (new)

## Change Log

- 2026-03-20: RLS audit completed. Applied migration `20260320120000_rls_fix_with_check_and_defaults.sql` — fixed `WITH CHECK` on 8 policies, added `DEFAULT auth.uid()` on 11 tables. Zero application code changes. Build passes.
