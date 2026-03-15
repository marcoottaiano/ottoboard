-- Recurring transactions
-- Run this in Supabase SQL Editor

CREATE TABLE recurring_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  amount        DECIMAL(10,2) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  description   TEXT,
  frequency     TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_due_date DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own recurring transactions"
ON recurring_transactions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
