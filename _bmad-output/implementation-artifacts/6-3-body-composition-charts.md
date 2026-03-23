# Story 6.3: Body Composition Charts

Status: ready-for-dev

## Story

As a user,
I want to view charts of my weight, body fat percentage, body composition, circumferences, and skinfolds over time,
So that I can visually track my progress across measurement sessions.

## Acceptance Criteria

1. **Given** ≥2 sessions with `weight_kg` **When** viewing `WeightChart` **Then** line chart shows weight over time with a 7-day moving average overlay

2. **Given** ≥2 sessions with `body_fat_pct` **When** viewing `BodyFatChart` **Then** reference bands (atleta / forma / normale) appear as background regions

3. **Given** sessions with both `lean_mass_kg` and `fat_mass_kg` **When** viewing `BodyCompositionChart` **Then** stacked area chart shows lean mass (orange) and fat mass (muted color) stacked over time

4. **Given** a chart with sessions where a measurement is NULL **When** it renders **Then** only sessions with that value are plotted — no interpolation or gaps filled

5. **Given** ≥2 sessions with circumference data **When** viewing `CircumferencesRadarChart` **Then** radar chart shows all circumferences normalized 0–100; user can overlay 2 dates

6. **Given** ≥1 session **When** viewing `MeasurementsDeltaChart` **Then** horizontal bar chart shows delta from first measurement (green = improvement, red = worsening — context-aware per metric)

7. **Given** ≥2 sessions with skinfold data **When** viewing `SkinfoldsTrendChart` **Then** line chart shows Σ pliche over time with toggle to show/hide individual sites

## Tasks / Subtasks

- [ ] Create `WeightChart.tsx` (AC: #1, #4)
  - [ ] Line chart with `weight_kg` over time (Recharts LineChart)
  - [ ] 7-day moving average computed client-side (helper in `bodyComposition.ts` or inline)
  - [ ] Filter out null `weight_kg` sessions before rendering
- [ ] Create `BodyFatChart.tsx` (AC: #2, #4)
  - [ ] Line chart `body_fat_pct` over time
  - [ ] Reference bands as `<ReferenceArea>` (Recharts): atleta <10%M/<20%F, forma <17%M/<27%F, normale <25%M/<35%F
  - [ ] Filter null `body_fat_pct` sessions
- [ ] Create `BodyCompositionChart.tsx` (AC: #3, #4)
  - [ ] Stacked AreaChart: `lean_mass_kg` (orange-400) + `fat_mass_kg` (neutral-500)
  - [ ] Filter sessions where either value is null
- [ ] Create `CircumferencesRadarChart.tsx` (AC: #5)
  - [ ] RadarChart with all 8 circumference fields
  - [ ] Normalize each to 0–100 scale (min-max across all sessions)
  - [ ] Date selector: show last session by default, allow selecting a second date to overlay
- [ ] Create `MeasurementsDeltaChart.tsx` (AC: #6)
  - [ ] Horizontal BarChart: delta from first measurement session
  - [ ] Color logic: for weight/fat/circumferences — lower = green. For lean_mass — higher = green
  - [ ] Show metric name + absolute delta + % change
- [ ] Create `SkinfoldsTrendChart.tsx` (AC: #7)
  - [ ] Line chart with Σ pliche (sum of available sites) as primary line
  - [ ] Toggle checkboxes to show/hide individual skinfold sites as additional lines
  - [ ] Filter null values per site
- [ ] Integrate all charts into `BodyMeasurementsTab.tsx` (story 6.2)
  - [ ] Show charts section below `MeasurementHistoryTable`
  - [ ] Each chart in a Card wrapper with title

## Dev Notes

- **Data source:** all charts use `useBodyMeasurements()` hook from story 6.2 — do NOT add new queries
- **Recharts version:** 2.x — use `LineChart`, `AreaChart`, `BarChart`, `RadarChart`, `ReferenceArea`, `ReferenceLine`
- **connectNulls:** set `connectNulls={false}` on all Line/Area components — AC #4 requires no interpolation
- **X-axis:** use `measured_at` (DATE string) as dataKey; format as short date for display
- **Moving average helper:**
  ```typescript
  function movingAverage(data: number[], window: number): (number | null)[] {
    return data.map((_, i) =>
      i < window - 1 ? null : data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0) / window
    )
  }
  ```
- **Reference bands for BodyFatChart** (male thresholds — use sex from `user_body_profile` if available):
  ```
  Atleta:  < 10% (male) / < 20% (female) — blue-500/20
  Forma:   10–17% (male) / 20–27% (female) — green-500/20
  Normale: 17–25% (male) / 27–35% (female) — yellow-500/20
  Alto:    > 25% (male) / > 35% (female) — red-500/20
  ```
- **RadarChart normalization:** compute per-field min/max across all sessions; normalized = (value - min) / (max - min) * 100
- **Chart colors:** use orange-400 as primary (fitness module color), neutral tones for secondary
- **Tooltip:** use custom Tooltip component or Recharts default with formatter — show actual values (not normalized) in tooltips
- **No external chart libraries** beyond Recharts 2.x — it's already installed

### Project Structure Notes

- All chart components go in `src/components/fitness/`
- Import `useBodyMeasurements` from `src/hooks/useBodyMeasurements.ts` (created in 6.2)
- `BodyMeasurementsTab.tsx` already exists from 6.2 — add charts there

### References

- [Source: CLAUDE.md#Fase-9-Grafici] — chart specifications and data mappings
- [Source: CLAUDE.md#Tech-Stack] — Recharts 2.x
- [Source: architecture.md#Frontend-Architecture] — no new queries in components

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
