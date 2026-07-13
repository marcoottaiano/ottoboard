-- Fix finance transaction writes under RLS.
-- Existing policies allow SELECT and INSERT, but UPDATE/DELETE were missing,
-- so edit and delete requests could complete without changing any rows.
DROP POLICY IF EXISTS "Users can update own transactions or household transactions" ON public.transactions;

CREATE POLICY "Users can update own transactions or household transactions" ON public.transactions FOR
UPDATE TO public USING (
  (user_id = auth.uid ())
  OR (
    (household_id IS NOT NULL)
    AND is_household_member (household_id)
  )
)
WITH
  CHECK (
    (user_id = auth.uid ())
    AND (
      (household_id IS NULL)
      OR is_household_member (household_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete own transactions or household transactions" ON public.transactions;

CREATE POLICY "Users can delete own transactions or household transactions" ON public.transactions FOR DELETE TO public USING (
  (user_id = auth.uid ())
  OR (
    (household_id IS NOT NULL)
    AND is_household_member (household_id)
  )
);