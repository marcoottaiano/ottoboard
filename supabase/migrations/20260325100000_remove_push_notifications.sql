-- Remove push notifications system (Story 7.2)
DROP TABLE IF EXISTS push_subscriptions CASCADE;
ALTER TABLE reminders DROP COLUMN IF EXISTS notified_at;
