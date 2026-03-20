-- Migration: Fix missing WITH CHECK clauses and DEFAULT auth.uid() on all user-owned tables
-- Story 5.4 — Data Isolation Verification (RLS Audit & Fix)
-- Date: 2026-03-20

-- =====================================================================
-- PART 1: Add WITH CHECK to policies that were missing it
-- These policies already have USING (auth.uid() = user_id),
-- but are missing WITH CHECK, leaving INSERT/UPDATE unprotected.
-- =====================================================================

ALTER POLICY own_activities ON activities
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_budgets ON budgets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_categories ON categories
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_columns ON columns
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_projects ON projects
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_tokens ON strava_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_tasks ON tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER POLICY own_transactions ON transactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- PART 2: Add DEFAULT auth.uid() to tables missing it
-- Without DEFAULT, client-side INSERT via anon key sends user_id = null
-- which triggers a 403 or silently stores null, bypassing RLS isolation.
-- =====================================================================

ALTER TABLE activities ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE budgets ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE categories ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE columns ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE linear_tokens ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE projects ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE push_subscriptions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE strava_tokens ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_body_profile ALTER COLUMN user_id SET DEFAULT auth.uid();
