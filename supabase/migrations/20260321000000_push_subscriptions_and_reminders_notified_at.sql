-- Migration: push_subscriptions table + RLS + reminders.notified_at
-- Note: these objects were created directly in Supabase dashboard during Phase 11.
-- This migration documents and ensures their existence for reproducibility.

-- ============================================================
-- TABLE: push_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

-- ============================================================
-- RLS: push_subscriptions
-- ============================================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'push_subscriptions'::regclass
      AND polname = 'Users manage own subscription'
  ) THEN
    CREATE POLICY "Users manage own subscription"
    ON push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- ============================================================
-- COLUMN: reminders.notified_at
-- ============================================================

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
