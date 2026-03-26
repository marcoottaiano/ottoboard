# Story 10.3: Day Itinerary with Drag and Drop

Status: ready-for-dev

## Story

As a user,
I want to build a day-by-day itinerary by dragging places into time slots,
So that I can visually plan each day of the trip.

## Acceptance Criteria

1. **Given** a trip without `data_inizio` or `data_fine` **When** I navigate to the Itinerario tab **Then** the itinerary is disabled with the message "Imposta le date del viaggio per attivare l'itinerario".

2. **Given** a trip with dates set **When** I open the Itinerario tab **Then** I see a horizontal scrollable tab row, one tab per day (e.g., "Lun 5 Mag"), defaulting to today's tab if within trip range **And** each day shows 6 time slots: colazione, mattina, pranzo, pomeriggio, cena, sera.

3. **Given** the itinerary is enabled **When** I drag a place from the unassigned Luoghi pool into a time slot using dnd-kit **Then** the place appears in that slot with an optimistic update **And** the itinerary item is saved to `trip_itinerary_items` with `item_type = 'place'`.

4. **Given** a place appears in a time slot **When** I optionally set an exact time (e.g., "14:30") **Then** `orario_preciso` is saved and displayed alongside the place name.

5. **Given** a placed card **When** I drag it to a different slot or day **Then** the assignment updates (optimistic update + DB persist).

6. **Given** a placed card **When** I remove it from the slot **Then** it returns to the unassigned places pool (item deleted from `trip_itinerary_items`).

7. **Given** a same place added to multiple slots **When** the itinerary renders **Then** both references are saved independently (place updates propagate to all slots — references, not copies).

8. **Given** accommodations with check-in and check-out dates **When** the itinerary renders **Then** each accommodation shows a non-draggable read-only event in the appropriate time slot on `check_in` date (Colazione slot) and `check_out` date (Mattina slot), with `item_type = 'accommodation_checkin'` / `'accommodation_checkout'`.

9. **Given** the trip `data_fine` is shortened **When** I confirm the date change **Then** a modal warns listing the affected itinerary items **And** if confirmed, `trip_itinerary_items` for removed days are deleted **And** if cancelled, the date change is reverted.

10. **Given** the trip `data_fine` is extended **When** the change is saved **Then** the new days are added as empty slots — no items moved.

## Tasks / Subtasks

- [ ] Task 1 - DB migration for `trip_itinerary_items` table (AC: 3, 4, 5, 6, 7, 8)
  - [ ] Create migration in `supabase/migrations/`:
    ```sql
    CREATE TABLE trip_itinerary_items (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      user_id          UUID NOT NULL DEFAULT auth.uid(),
      day_date         DATE NOT NULL,
      time_slot        TEXT NOT NULL,  -- colazione | mattina | pranzo | pomeriggio | cena | sera
      item_type        TEXT NOT NULL,  -- place | accommodation_checkin | accommodation_checkout
      place_id         UUID REFERENCES trip_places(id) ON DELETE CASCADE,
      accommodation_id UUID REFERENCES trip_accommodations(id) ON DELETE CASCADE,
      orario_preciso   TIME,
      position         INT NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE POLICY "trip_itinerary_items_rls" ON trip_itinerary_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;
    ```
  - [ ] Run `supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] Task 2 - Create `useTripItinerary` hook (AC: 3–10)
  - [ ] Create `src/hooks/useTripItinerary.ts`:
    - `useTripItineraryItems(tripId)` — fetch all items for trip, keyed by `{ day_date, time_slot }`
    - `useAddItineraryItem()` — insert item with `item_type = 'place'`, optimistic + rollback
    - `useMoveItineraryItem()` — update `day_date` + `time_slot` + `position`, optimistic + rollback
    - `useRemoveItineraryItem()` — delete item, optimistic + rollback
    - `useSetExactTime()` — update `orario_preciso` on item, optimistic + rollback
  - [ ] Accommodation check-in/out events: derived client-side from `useTripAccommodations` data — NOT stored in `trip_itinerary_items`; rendered as read-only non-draggable items

- [ ] Task 3 - Build ItinerarioTab (AC: 1, 2)
  - [ ] Create `src/components/travel/ItinerarioTab.tsx` — main tab container
  - [ ] If trip has no dates: show disabled state message
  - [ ] If trip has dates: generate day list from `data_inizio` to `data_fine` (inclusive) using `toLocalDateStr()` — use `getFullYear/getMonth/getDate` NOT `toISOString()`
  - [ ] Day tab row: horizontal scrollable (`overflow-x-auto overflow-y-hidden`), one tab per day, format "Lun 5 Mag" using locale-aware day name
  - [ ] Default selected tab: today's date if within range, else first day

- [ ] Task 4 - Day column layout with 6 time slots (AC: 2, 3, 4, 5, 6, 7, 8)
  - [ ] Create `src/components/travel/ItineraryDayColumn.tsx` — shows 6 slot sections for selected day
  - [ ] TIME_SLOTS constant: `['colazione', 'mattina', 'pranzo', 'pomeriggio', 'cena', 'sera']`
  - [ ] Each slot: header label + droppable zone (dnd-kit `useDroppable`) + list of items
  - [ ] Accommodation events: rendered in slot as non-draggable pills (check-in in 'colazione' slot, check-out in 'mattina' slot) — visually distinct (e.g., `opacity-60`, no drag handle)

- [ ] Task 5 - DnD: unassigned places pool (AC: 3, 6)
  - [ ] Create `src/components/travel/UnassignedPlacesPool.tsx` — shows all trip places not yet in any slot (or shown even if also in some slots, since same place can be in multiple slots)
  - [ ] Each place card in pool: `useDraggable` from dnd-kit with `data = { placeId, sourceType: 'pool' }`
  - [ ] Place already in a slot does NOT disappear from pool (references, not copies)

- [ ] Task 6 - DnD: dragging items between slots (AC: 3, 5)
  - [ ] `DndContext` wrapping `ItinerarioTab` with sensors: `PointerSensor` (desktop) + `TouchSensor({ delay: 200, tolerance: 8 })` (mobile — same config as Kanban)
  - [ ] `onDragEnd` handler:
    - If from pool → slot: call `useAddItineraryItem` with `place_id`, `day_date`, `time_slot`
    - If from slot → slot: call `useMoveItineraryItem` with updated `day_date` + `time_slot`
    - If dropped back on pool or invalid target: call `useRemoveItineraryItem`
  - [ ] Each placed card in slot: `useDraggable` with `data = { itemId, sourceSlot, sourceDay, sourceType: 'slot' }`
  - [ ] Each slot zone: `useDroppable` with `id = \`${day_date}:${time_slot}\``

- [ ] Task 7 - Exact time input on placed items (AC: 4)
  - [ ] In slot item card: small time input (`<input type="time">`) shown on hover/tap
  - [ ] On change: call `useSetExactTime()` with debounce (500ms)
  - [ ] Display `orario_preciso` (e.g., "14:30") next to place name when set

- [ ] Task 8 - Date change conflict modal (AC: 9, 10)
  - [ ] In `TripFormModal` (from story 10.1): when `data_fine` is reduced, check existing `trip_itinerary_items` for days outside new range
  - [ ] If items exist on removed days: show `DateChangeWarningModal` listing affected place names
  - [ ] On confirm: delete items in removed days, then save new dates
  - [ ] On cancel: revert `data_fine` input to original value

- [ ] Task 9 - Verification (AC: 1–10)
  - [ ] Run `npm.cmd run build` — zero TypeScript errors
  - [ ] Manual QA: trip with no dates → disabled state shown
  - [ ] Manual QA: drag from pool to slot → item appears, persisted to DB
  - [ ] Manual QA: drag between slots → updates in DB
  - [ ] Manual QA: remove from slot → returns to pool concept; item deleted from DB
  - [ ] Manual QA: same place in 2 slots simultaneously → both saved
  - [ ] Manual QA: accommodation check-in/out appear as non-draggable on correct days
  - [ ] Manual QA: shorten trip → modal warns affected items; confirm deletes them

## Dev Notes

### Story Context

This story implements the core itinerary builder. It depends on `trips` (10.1) and `trip_places` + `trip_accommodations` (10.2). The `trip_itinerary_items` table stores placed items only for `item_type = 'place'`. Accommodation check-in/out events are derived client-side from accommodation data and never written to `trip_itinerary_items`.

Story 10.5 will add a "Genera percorso" button to this tab using coordinates from placed items in chronological order.

### Technical Requirements

- **dnd-kit pattern:** Follow exactly the same sensor configuration as the existing Kanban (`TouchSensor` delay=200, tolerance=8). Study `src/components/projects/KanbanBoard.tsx` (removed in epic 7, but pattern is in other DnD usages) or refer to `src/components/home/WidgetShell.tsx` for DnD patterns.
- **Date generation:** Generate days from `data_inizio` to `data_fine` using `new Date(year, month, day)` local constructors — NEVER `new Date(isoString)` for date range generation (UTC offset causes off-by-one on first/last day). Use `toLocalDateStr()` for all string representations.
- **Overflow fix:** The day tab row uses `overflow-x-auto`. Add `overflow-y-hidden` explicitly to prevent implicit `overflow-y: auto` (CSS spec side effect).
- **References, not copies:** Same place can appear in multiple slots. The `useTripItinerary` pool computation should NOT exclude places already in slots from the pool.
- **Accommodation events derived:** Do not write check-in/out events to DB. Derive them in the component: for each accommodation, create virtual items for `check_in` day (colazione slot) and `check_out` day (mattina slot).
- **RLS:** `trip_itinerary_items` requires `DEFAULT auth.uid()` + `USING` + `WITH CHECK`.
- **Optimistic updates + rollback mandatory** on all mutations.

### Architecture Compliance

- DnD logic in `ItinerarioTab` component with `DndContext`.
- Server state in `src/hooks/useTripItinerary.ts`.
- Components in `src/components/travel/`.
- `TIME_SLOTS` constant defined once and reused (e.g., in `src/lib/travel/constants.ts` or top of the hook file).

### Library/Framework Requirements

- `dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`) — already in the project from previous Kanban/home DnD usage.
- TanStack Query v5.
- Supabase client.
- Tailwind CSS.

### File Structure Requirements

- New: `src/hooks/useTripItinerary.ts`
- New: `src/components/travel/ItinerarioTab.tsx`
- New: `src/components/travel/ItineraryDayColumn.tsx`
- New: `src/components/travel/UnassignedPlacesPool.tsx`
- New: `src/components/travel/DateChangeWarningModal.tsx`
- Modified: `src/app/travel/[id]/page.tsx` (replace Itinerario tab placeholder with real component)
- Modified: `src/components/travel/TripFormModal.tsx` (add date change conflict check from story 10.1)
- New: `supabase/migrations/YYYYMMDD_create_trip_itinerary_items.sql`

### Testing Requirements

- Build: `npm.cmd run build` zero TS errors.
- Manual QA all 10 ACs.
- Verify `toLocalDateStr()` used for all date range generation (check day tabs match expected dates in CET timezone).
- Verify accommodation events appear on correct days (not shifted by UTC offset).

### Implementation Guardrails

- Do NOT use `toISOString()` for day date generation or comparison.
- Do NOT store accommodation check-in/out events in `trip_itinerary_items`.
- Do NOT exclude pool items already placed in a slot (same place can be in multiple slots).
- Do NOT add `overflow-x-auto` to day tab row without `overflow-y-hidden`.
- Do NOT implement the "Genera percorso" button here — that belongs to story 10.5.

### Previous Story Intelligence

- Story 10.1 created `trips` table and trip detail page structure.
- Story 10.2 created `trip_places` and `trip_accommodations`. Hook `useTripAccommodations(tripId)` provides accommodation data needed for derived check-in/out events in this story.
- dnd-kit DnD was used in the home widget reorder (`src/components/home/WidgetShell.tsx`) — study that for `DndContext` + sensor setup.

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 10, Story 10.3 (lines ~1664–1703) + Technical Notes (lines ~1502–1513)
- DB schema: `_bmad-output/planning_artifacts/epics.md` (lines ~1568–1581 for `trip_itinerary_items`)
- Architecture patterns: `_bmad-output/planning_artifacts/architecture.md` (DnD, optimistic update, date safety, overflow CSS)
- DnD reference: `src/components/home/WidgetShell.tsx` (DnD sensors, draggable/droppable pattern)
- Date utility: `src/lib/dateUtils.ts` (`toLocalDateStr`)
- Hooks from story 10.2: `src/hooks/useTripAccommodations.ts`

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Completion Notes List

_to be filled by dev agent_

### File List

_to be filled by dev agent_

## Change Log

- 2026-03-26: Story created — Day Itinerary with Drag and Drop for Epic 10 Travel Planning Module.
