# Story 10.4: Trip Cost Estimate

Status: review

## Story

As a user,
I want to see a read-only cost breakdown for my trip,
So that I can understand total expenses and per-person quota without manual calculations.

## Acceptance Criteria

1. **Given** I open the "Stima Costi" tab on a trip detail page **When** the tab renders **Then** I see a read-only summary with three sections: Alloggi, Attrazioni, Trasporti.

2. **Given** accommodations with `includi_in_stima = true` **When** costs are calculated **Then** Alloggi total = sum of `prezzo_totale` for accommodations where `includi_in_stima = true`.

3. **Given** places of `tipo = 'attrazione'` with `prezzo_per_persona` set **When** costs are calculated **Then** Attrazioni total = sum of (`prezzo_per_persona` × `partecipanti`) for each such attraction.

4. **Given** transports with `prezzo` set **When** costs are calculated **Then** for `prezzo_tipo = 'per_persona'`: cost = `prezzo` × `partecipanti` **And** for `prezzo_tipo = 'totale'`: cost = `prezzo` as-is.

5. **Given** all three sections computed **When** the summary renders **Then** a "Totale stimato" row shows the sum of all section totals **And** a "Quota per persona" row shows `totale_stimato / partecipanti`.

6. **Given** a field is missing (e.g., accommodation has no `prezzo_totale`, place has no `prezzo_per_persona`, transport has no `prezzo`) **When** the estimate renders **Then** that item shows "—" in its row and is excluded from the total with no error.

7. **Given** ristoranti and bar in trip_places **When** costs are calculated **Then** they are NOT included in any calculation (only `tipo = 'attrazione'` places are included).

8. **Given** no data in any section **When** the tab renders **Then** each empty section shows "Nessun dato disponibile" and totals show "—".

## Tasks / Subtasks

- [x] Task 1 - Create `useTripCostEstimate` hook (AC: 1–8)
  - [x] Create `src/hooks/useTripCostEstimate.ts`
  - [x] Inputs: `tripId` — internally uses `useTripAccommodations(tripId)`, `useTripPlaces(tripId)`, `useTripTransports(tripId)`, and trip `partecipanti` from `useTrip(tripId)`
  - [x] Compute client-side (no new DB query needed):
    - `alloggiTotal`: sum `prezzo_totale` where `includi_in_stima = true` and `prezzo_totale != null`
    - `attrazioniTotal`: sum `prezzo_per_persona * partecipanti` where `tipo = 'attrazione'` and `prezzo_per_persona != null`
    - `trasportiTotal`: sum each transport: `prezzo_tipo = 'per_persona'` → `prezzo * partecipanti`; `'totale'` → `prezzo`; skip if `prezzo == null`
    - `totaleStimato`: alloggiTotal + attrazioniTotal + trasportiTotal
    - `quotaPerPersona`: `totaleStimato / partecipanti` (only if `partecipanti > 0`)
  - [x] Return per-section item arrays (for rendering individual rows) + totals
  - [x] Handle null/missing values: exclude from sum, mark as `null` in item row for "—" display

- [x] Task 2 - Build StimaCostiTab component (AC: 1–8)
  - [x] Create `src/components/travel/StimaCostiTab.tsx`
  - [x] Three sections: Alloggi, Attrazioni, Trasporti — each with a table/list of items
  - [x] Each item row: name | computed cost or "—"
  - [x] Section subtotal row (bold): sum of non-null items or "—" if all null
  - [x] Summary footer: "Totale stimato" + "Quota per persona" in a highlighted card
  - [x] Empty section: show "Nessun dato disponibile" placeholder
  - [x] Read-only — no edit controls in this tab

- [x] Task 3 - Add Stima Costi tab to trip detail page (AC: 1)
  - [x] Update `src/app/travel/[id]/page.tsx` tab list to include "Stima Costi" tab (after Trasporti, before or after Itinerario)
  - [x] Update `src/components/travel/TripDetailTabs.tsx` to include the new tab
  - [x] Render `StimaCostiTab` when tab is active

- [x] Task 4 - Verification (AC: 1–8)
  - [x] Run `npm.cmd run build` — zero TypeScript errors
  - [ ] Manual QA: add 2 accommodations (one with includi_in_stima=false) → only one counted
  - [ ] Manual QA: add attraction with prezzo_per_persona=20, partecipanti=3 → shows 60
  - [ ] Manual QA: add transport per_persona=50, partecipanti=3 → shows 150; totale=200 → shows 200
  - [ ] Manual QA: missing price fields → show "—" and excluded from total
  - [ ] Manual QA: ristorante / bar places → NOT shown in Attrazioni section
  - [ ] Manual QA: empty trip → each section shows "Nessun dato disponibile"

## Dev Notes

### Story Context

This story is purely a read-only computation tab. No new DB tables. No mutations. All data comes from existing hooks created in stories 10.1 (trips for `partecipanti`), 10.2 (accommodations, places, transports). The hook aggregates and computes — no additional Supabase queries needed.

This is the simplest story in Epic 10 — computation logic + display only.

### Technical Requirements

- **No new tables or migrations.** All data already in `trips`, `trip_places`, `trip_accommodations`, `trip_transports`.
- **Computation is client-side only** in `useTripCostEstimate.ts` — no SQL aggregation.
- **partecipanti** comes from the `trips` row (fetched by `useTrip(tripId)`). Guard against `partecipanti = 0` (division by zero in quota).
- **tipo filter:** Only `tipo = 'attrazione'` places count. `ristorante` and `bar` are excluded.
- **includi_in_stima:** Only accommodations with `includi_in_stima = true` counted. This toggle is managed in story 10.2.
- **prezzo_tipo:** `'per_persona'` multiplies by `partecipanti`; `'totale'` is used as-is.
- **Null handling:** If `prezzo_totale`, `prezzo_per_persona`, or `prezzo` is null → exclude from sum + show "—" in that row.
- **No optimistic updates needed** — read-only tab.

### Architecture Compliance

- Hook in `src/hooks/useTripCostEstimate.ts` — pure computation hook, no Supabase calls.
- Component in `src/components/travel/StimaCostiTab.tsx`.
- Page update: `src/app/travel/[id]/page.tsx`.
- Reuse `useTrip(tripId)` (or equivalent single-trip fetch) from story 10.1 for `partecipanti`.

### Library/Framework Requirements

- TanStack Query v5 (hooks from 10.1 and 10.2 already set up).
- No new libraries.
- Tailwind CSS dark glassmorphism for summary card.

### File Structure Requirements

- New: `src/hooks/useTripCostEstimate.ts`
- New: `src/components/travel/StimaCostiTab.tsx`
- Modified: `src/app/travel/[id]/page.tsx` (add Stima Costi tab)
- Modified: `src/components/travel/TripDetailTabs.tsx` (add tab entry)

### Testing Requirements

- Build: `npm.cmd run build` zero TS errors.
- Manual QA all 8 ACs with multiple data combinations.
- Verify null handling: no crashes, "—" displayed correctly.
- Verify `partecipanti = 0` edge case (should not cause division by zero).

### Implementation Guardrails

- Do NOT add edit controls to the Stima Costi tab — read-only only.
- Do NOT include ristorante/bar in Attrazioni calculation.
- Do NOT add any new Supabase queries — reuse existing hooks.
- Do NOT create a separate Supabase RPC for this — client-side computation only.
- Guard `partecipanti` division: if `partecipanti <= 0`, show "—" for quota.

### Previous Story Intelligence

- Story 10.1 provides `useTrip(tripId)` (or `useTrips` filtered by id) for `partecipanti`.
- Story 10.2 provides `useTripAccommodations(tripId)`, `useTripPlaces(tripId)`, `useTripTransports(tripId)` — these are already set up and can be composed directly.
- This is the 4th story in Epic 10 — all core data hooks exist. This story only reads from them.

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 10, Story 10.4 (lines ~1706–1740) + Technical Notes (lines ~1502–1513)
- Hooks from story 10.2: `src/hooks/useTripAccommodations.ts`, `src/hooks/useTripPlaces.ts`, `src/hooks/useTripTransports.ts`
- Hooks from story 10.1: `src/hooks/useTrips.ts`
- Architecture patterns: `_bmad-output/planning_artifacts/architecture.md` (hook composition, no mutations for read-only)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Task 1: Created `useTripCostEstimate.ts` — pure computation hook composing `useTrip`, `useTripAccommodations`, `useTripPlaces`, `useTripTransports`. Uses `useMemo` for derived values. `sumNullable` helper returns `null` when all inputs are null (no data), otherwise sums non-null values. Guards `partecipanti <= 0` to avoid division by zero.
- Task 2: Created `StimaCostiTab.tsx` — three sections (Alloggi, Attrazioni, Trasporti) plus a summary footer card. Each section shows "Nessun dato disponibile" when empty. Items with null cost display "—". Skeleton loading state via animated pulse placeholders.
- Task 3: Added `'stima-costi'` to `TripTab` union type in `TripDetailTabs.tsx` and rendered `StimaCostiTab` in `travel/[id]/page.tsx`.
- Task 4: `npm.cmd run build` — 0 TypeScript errors, 26 pages generated. Manual QA items require browser testing by the user.

### File List

- src/hooks/useTripCostEstimate.ts (new)
- src/components/travel/StimaCostiTab.tsx (new)
- src/app/travel/[id]/page.tsx (modified)
- src/components/travel/TripDetailTabs.tsx (modified)

## Change Log

- 2026-03-26: Story created — Trip Cost Estimate for Epic 10 Travel Planning Module.
- 2026-03-27: Story implemented — useTripCostEstimate hook, StimaCostiTab component, tab wiring. Build green.
