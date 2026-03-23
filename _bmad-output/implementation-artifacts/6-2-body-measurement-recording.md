# Story 6.2: Body Measurement Recording

Status: ready-for-dev

## Story

As a user,
I want to record a body measurement session (weight, skinfolds, circumferences) with all fields optional,
So that I can log only what I measured today without being forced to fill the entire form.

## Acceptance Criteria

1. **Given** I open the Body tab in `/fitness` **When** I enter only weight + date and save **Then** a `body_measurements` row is created with only `weight_kg` populated and all other fields NULL

2. **Given** I enter a full JP3 or JP7 skinfold set **When** I save **Then** `body_fat_pct`, `fat_mass_kg`, `lean_mass_kg` are calculated via Jackson-Pollock + Siri and persisted

3. **Given** the user has no `user_body_profile` (height, sex, birth_date) **When** they try to save skinfolds **Then** a prompt asks to complete the body profile first — form data is NOT discarded

4. **Given** I save a measurement session **When** I click a row in `MeasurementHistoryTable` **Then** the row opens in edit mode with pre-filled values

5. **Given** the `/fitness` page loads **When** I click the "Corpo" tab **Then** the tab renders `BodyMeasurementsTab` without error; the "Strava" tab continues to work unchanged

## Tasks / Subtasks

- [ ] DB migration: create `body_measurements` and `user_body_profile` tables (AC: #1, #2)
  - [ ] Create migration SQL with all columns from schema (see Dev Notes)
  - [ ] Add RLS policies with `DEFAULT auth.uid()` on `user_id`
  - [ ] Apply migration via Supabase MCP or CLI
- [ ] Add tab state to `FitnessPage` (AC: #5)
  - [ ] Add `activeTab: 'strava' | 'body'` state (useState)
  - [ ] Render tab switcher UI (consistent with habits/projects tab style)
  - [ ] Conditionally render `BodyMeasurementsTab` vs existing Strava content
- [ ] Create `src/lib/bodyComposition.ts` (AC: #2)
  - [ ] Implement `calcJP3Male(chest, abdomen, thigh, age)` → density
  - [ ] Implement `calcJP3Female(tricep, suprailiac, thigh, age)` → density
  - [ ] Implement `calcJP7Male(c, a, t, tr, si, ss, ma, age)` → density
  - [ ] Implement `calcJP7Female(c, a, t, tr, si, ss, ma, age)` → density
  - [ ] Implement `siri(density)` → body_fat_pct
  - [ ] Implement `calcComposition(measurements, profile)` → `{ body_fat_pct, fat_mass_kg, lean_mass_kg } | null`
- [ ] Create `src/hooks/useBodyMeasurements.ts` (AC: #1, #2, #4)
  - [ ] `useBodyMeasurements()` — fetch all sessions for user, sorted by `measured_at` DESC
  - [ ] `useCreateMeasurement()` mutation with optimistic update + rollback
  - [ ] `useUpdateMeasurement()` mutation
  - [ ] `useBodyProfile()` — fetch/upsert `user_body_profile`
- [ ] Create `MeasurementForm.tsx` (AC: #1, #2, #3)
  - [ ] All fields optional except `measured_at` (date)
  - [ ] Section grouping: Peso / Plicometrie / Circonferenze
  - [ ] Show JP3/JP7 selector when skinfold fields are partially filled
  - [ ] If skinfolds entered but no body profile → show inline prompt, do not clear form
  - [ ] On save: call `calcComposition()`, include result in INSERT payload
- [ ] Create `BodyProfileModal.tsx` (AC: #3)
  - [ ] Fields: height_cm, sex (select: male/female), birth_date
  - [ ] Upsert to `user_body_profile` on save
- [ ] Create `MeasurementHistoryTable.tsx` (AC: #4)
  - [ ] Columns: date, weight, body_fat_pct, lean_mass_kg
  - [ ] Click row → opens `MeasurementForm` in edit mode with pre-filled data
  - [ ] Pagination: 20 per page
- [ ] Create `BodyMeasurementsTab.tsx` (AC: #5)
  - [ ] Layout: MeasurementForm (or "+ Aggiungi" button) + MeasurementHistoryTable
  - [ ] Show `BodyProfileModal` if profile is missing on first load

## Dev Notes

### DB Schema

```sql
-- body_measurements
CREATE TABLE body_measurements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid(),
  measured_at   DATE NOT NULL,
  weight_kg     FLOAT,
  skinfold_chest        FLOAT,
  skinfold_abdomen      FLOAT,
  skinfold_thigh        FLOAT,
  skinfold_tricep       FLOAT,
  skinfold_suprailiac   FLOAT,
  skinfold_subscapular  FLOAT,
  skinfold_midaxillary  FLOAT,
  circ_waist    FLOAT, circ_hip   FLOAT, circ_chest  FLOAT,
  circ_arm      FLOAT, circ_forearm FLOAT, circ_thigh FLOAT,
  circ_calf     FLOAT, circ_neck  FLOAT,
  body_fat_pct  FLOAT,
  fat_mass_kg   FLOAT,
  lean_mass_kg  FLOAT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE body_measurements ALTER COLUMN user_id SET DEFAULT auth.uid();
CREATE POLICY "Users can only see their own data" ON body_measurements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_body_profile
CREATE TABLE user_body_profile (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id),
  height_cm  FLOAT NOT NULL,
  sex        TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  birth_date DATE NOT NULL
);
-- No user_id DEFAULT needed — PK is user_id, inserted explicitly
CREATE POLICY "Users can only see their own profile" ON user_body_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Jackson-Pollock Formulas

```typescript
// JP3 Male: chest + abdomen + thigh
density = 1.10938 - (0.0008267 * sum3) + (0.0000016 * sum3**2) - (0.0002574 * age)

// JP3 Female: tricep + suprailiac + thigh
density = 1.0994921 - (0.0009929 * sum3) + (0.0000023 * sum3**2) - (0.0001392 * age)

// JP7 Male: all 7 sites
density = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7**2) - (0.00028826 * age)

// JP7 Female: all 7 sites
density = 1.097 - (0.00046971 * sum7) + (0.00000056 * sum7**2) - (0.00012828 * age)

// Siri equation
body_fat_pct = (495 / density) - 450

// Derived
fat_mass_kg  = weight_kg * body_fat_pct / 100
lean_mass_kg = weight_kg - fat_mass_kg
```

- Return `null` from `calcComposition()` if required sites are missing OR no `user_body_profile`
- Age = `differenceInYears(new Date(), new Date(profile.birth_date))` — use `date-fns` if available, else manual calc

### Architecture Constraints

- Components go in `src/components/fitness/`
- Hook in `src/hooks/useBodyMeasurements.ts`
- JP formulas in `src/lib/bodyComposition.ts` (new file)
- Follow React Query v5 pattern from architecture (see Communication Patterns)
- `useBodyProfile` uses `upsert` (whole row replacement is safe — it's a single-row profile table)
- All other mutations use `update()` — never `upsert` with partial fields
- Optimistic update required for `useCreateMeasurement` (consistency with rest of app)
- Fitness module color: `orange` — use `orange-400/500` for accents

### Project Structure Notes

- `FitnessPage` is at `src/app/fitness/page.tsx`
- Tab UI: follow same pattern as other tabbed pages in the project (check habits or projects)
- Do NOT touch Strava tab content — it must continue working unchanged

### References

- [Source: CLAUDE.md#Fase-9] — full spec, schema, formulas, components list
- [Source: architecture.md#RLS-Pattern] — RLS policy pattern
- [Source: architecture.md#Communication-Patterns] — React Query hook structure
- [Source: architecture.md#Database-Naming] — naming conventions

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
