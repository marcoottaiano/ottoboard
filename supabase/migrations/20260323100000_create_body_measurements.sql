-- Migration: Create body_measurements and user_body_profile tables
-- Story: 6-2 Body Measurement Recording
-- Note: These tables were created directly in Supabase; this file documents that creation.

-- ============================================================
-- TABLE: user_body_profile
-- Static user data needed for Jackson-Pollock body fat formulas
-- ============================================================
CREATE TABLE IF NOT EXISTS user_body_profile (
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm  DOUBLE PRECISION NOT NULL,
  sex        TEXT NOT NULL,
  birth_date DATE NOT NULL,
  PRIMARY KEY (user_id)
);

ALTER TABLE user_body_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own body profile"
  ON user_body_profile
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: body_measurements
-- Individual measurement sessions (weight, skinfolds, circumferences)
-- body_fat_pct / fat_mass_kg / lean_mass_kg are computed via JP formulas and persisted
-- ============================================================
CREATE TABLE IF NOT EXISTS body_measurements (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL DEFAULT auth.uid(),
  measured_at          DATE        NOT NULL,

  -- Weight
  weight_kg            DOUBLE PRECISION,

  -- Skinfolds (mm) — Jackson-Pollock protocol
  skinfold_chest       DOUBLE PRECISION,
  skinfold_abdomen     DOUBLE PRECISION,
  skinfold_thigh       DOUBLE PRECISION,
  skinfold_tricep      DOUBLE PRECISION,
  skinfold_suprailiac  DOUBLE PRECISION,
  skinfold_subscapular DOUBLE PRECISION,
  skinfold_midaxillary DOUBLE PRECISION,

  -- Circumferences (cm)
  circ_waist           DOUBLE PRECISION,
  circ_hip             DOUBLE PRECISION,
  circ_chest           DOUBLE PRECISION,
  circ_arm             DOUBLE PRECISION,
  circ_forearm         DOUBLE PRECISION,
  circ_thigh           DOUBLE PRECISION,
  circ_calf            DOUBLE PRECISION,
  circ_neck            DOUBLE PRECISION,

  -- Computed and persisted
  body_fat_pct         DOUBLE PRECISION,
  fat_mass_kg          DOUBLE PRECISION,
  lean_mass_kg         DOUBLE PRECISION,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own body measurements"
  ON body_measurements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
