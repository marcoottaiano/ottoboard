-- Epic 10: Travel Planning Module — trips table
CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL DEFAULT auth.uid(),
  nome            TEXT NOT NULL,
  cover_photo_url TEXT,
  stato           TEXT NOT NULL DEFAULT 'bozza',
  data_inizio     DATE,
  data_fine       DATE,
  partecipanti    INT NOT NULL DEFAULT 1,
  share_token     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_rls"
ON trips FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
