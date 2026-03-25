-- Add position column for waterfall ordering (stories 8.2, 8.3)
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Backfill sequential positions per user ordered by created_at
UPDATE financial_goals
SET position = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM financial_goals
) sub
WHERE financial_goals.id = sub.id;
