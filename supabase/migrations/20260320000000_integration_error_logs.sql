CREATE TABLE integration_error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  service       TEXT NOT NULL CHECK (service IN ('linear', 'strava')),
  error_message TEXT NOT NULL,
  error_code    TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE integration_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own integration error logs"
ON integration_error_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
