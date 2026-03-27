-- Epic 10.2: Trip places, accommodations, transports
-- Applied directly via Supabase MCP execute_sql

CREATE TABLE trip_places (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL DEFAULT auth.uid(),
  tipo               TEXT NOT NULL CHECK (tipo IN ('ristorante', 'bar', 'attrazione')),
  nome               TEXT NOT NULL,
  maps_url           TEXT,
  lat                FLOAT,
  lon                FLOAT,
  descrizione        TEXT,
  prezzo_per_persona FLOAT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip_places_rls" ON trip_places FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE trip_accommodations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL DEFAULT auth.uid(),
  nome             TEXT NOT NULL,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  prezzo_totale    FLOAT,
  link_booking     TEXT,
  maps_url         TEXT,
  lat              FLOAT,
  lon              FLOAT,
  includi_in_stima BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_out_after_check_in CHECK (check_out > check_in)
);
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip_accommodations_rls" ON trip_accommodations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE trip_transports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL DEFAULT auth.uid(),
  categoria   TEXT NOT NULL CHECK (categoria IN ('outbound', 'locale')),
  nome        TEXT NOT NULL,
  prezzo      FLOAT,
  prezzo_tipo TEXT NOT NULL DEFAULT 'per_persona' CHECK (prezzo_tipo IN ('per_persona', 'totale')),
  descrizione TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE trip_transports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip_transports_rls" ON trip_transports FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
