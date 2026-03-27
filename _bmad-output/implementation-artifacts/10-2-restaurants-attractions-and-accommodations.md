# Story 10.2: Luoghi, Alloggi e Trasporti

Status: ready-for-dev

## Story

As a user,
I want to add places (restaurants, bars, attractions), accommodations, and transports to a trip,
So that I have all trip logistics organized in one place with map previews.

## Acceptance Criteria

1. **Given** I am on the trip detail page `/travel/[id]`, Luoghi tab **When** I add a place with a Google Maps URL **Then** the system parses `lat` and `lon` from the URL (formats: `@lat,lon` or `?q=lat,lon`) **And** if parsing succeeds, a Leaflet map preview is shown in the place modal (loaded via `dynamic(..., { ssr: false })`) **And** if parsing fails, an inline message "Coordinate non trovate — inserisci manualmente" with lat/lon input fields appears **And** the place is saved regardless of whether coordinates are present.

2. **Given** places exist in the list **When** I apply a text filter or category filter (ristorante / bar / attrazione) **Then** only matching places are shown **When** I click "Ordina per prezzo" **Then** places are sorted ascending by `prezzo_per_persona` (null prices sorted last).

3. **Given** I click on a place **When** the modal opens **Then** I see the Leaflet map (if coordinates exist), name, type badge, description, price, and Maps link **And** I can edit or delete the place from the modal.

4. **Given** I am on the Alloggi tab **When** I add an accommodation with check-in and check-out dates **Then** if those dates overlap with any existing accommodation, an inline error shows "Date sovrapposte con [nome alloggio]" and the save is blocked.

5. **Given** an accommodation exists **When** I toggle "Includi in stima" to ON while another accommodation with overlapping dates is already ON **Then** an inline error shows "Date sovrapposte con [nome alloggio]" and the toggle reverts to OFF.

6. **Given** accommodations are saved **When** the itinerary tab is opened (story 10.3) **Then** each accommodation automatically shows a non-draggable check-in event on `day_date = check_in` and check-out event on `day_date = check_out`.

7. **Given** I am on the Trasporti tab **When** I add a transport with `categoria = outbound` **Then** it appears in the "Trasporto per arrivare" section **When** I add one with `categoria = locale` **Then** it appears in the "Trasporti locali" section.

8. **Given** any saved place, accommodation, or transport **When** I delete it **Then** it is removed from both UI and DB (optimistic update + rollback on error).

## Tasks / Subtasks

- [ ] Task 1 - DB migration for places, accommodations, and transports tables (AC: 1–8)
  - [ ] Create migration in `supabase/migrations/` with:
    ```sql
    CREATE TABLE trip_places (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      user_id            UUID NOT NULL DEFAULT auth.uid(),
      tipo               TEXT NOT NULL,  -- ristorante | bar | attrazione
      nome               TEXT NOT NULL,
      maps_url           TEXT,
      lat                FLOAT,
      lon                FLOAT,
      descrizione        TEXT,
      prezzo_per_persona FLOAT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE POLICY "trip_places_rls" ON trip_places FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;

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
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE POLICY "trip_accommodations_rls" ON trip_accommodations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;

    CREATE TABLE trip_transports (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL DEFAULT auth.uid(),
      categoria   TEXT NOT NULL,  -- outbound | locale
      nome        TEXT NOT NULL,
      prezzo      FLOAT,
      prezzo_tipo TEXT NOT NULL DEFAULT 'per_persona',  -- per_persona | totale
      descrizione TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE POLICY "trip_transports_rls" ON trip_transports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ALTER TABLE trip_transports ENABLE ROW LEVEL SECURITY;
    ```
  - [ ] Run `supabase gen types typescript --local > src/lib/supabase/types.ts` after migration

- [ ] Task 2 - Google Maps URL parser utility (AC: 1)
  - [ ] Create `src/lib/travel/mapsUrlParser.ts` with `parseMapsUrl(url: string): { lat: number; lon: number } | null`
  - [ ] Support formats: `@lat,lon` (e.g., `@41.9028,12.4964`) and `?q=lat,lon`
  - [ ] Do NOT attempt to resolve short links (`maps.app.goo.gl/...`) — short links do not contain coordinates; show manual fallback immediately
  - [ ] Return `null` for any URL that doesn't match supported formats

- [ ] Task 3 - React-Leaflet map component (AC: 1, 3)
  - [ ] Install `react-leaflet` and `leaflet` if not already present (`npm install react-leaflet leaflet`)
  - [ ] Create `src/components/travel/PlaceMapPreview.tsx` — wraps `MapContainer + TileLayer + Marker` from `react-leaflet`
  - [ ] **CRITICAL:** Import this component ONLY via `dynamic(() => import('./PlaceMapPreview'), { ssr: false })` wherever used — never import directly. Missing `ssr: false` causes Next.js build failure.
  - [ ] Add `import 'leaflet/dist/leaflet.css'` inside the dynamically-loaded component file (not in root layout)
  - [ ] Fix Leaflet default marker icon: set `L.Icon.Default.mergeOptions({ iconUrl, shadowUrl })` inside the component (Leaflet webpack issue)

- [ ] Task 4 - Create hooks for places, accommodations, transports (AC: 1–8)
  - [ ] Create `src/hooks/useTripPlaces.ts`: `useTripPlaces(tripId)`, `useCreatePlace()`, `useUpdatePlace()`, `useDeletePlace()` — all with optimistic update + rollback
  - [ ] Create `src/hooks/useTripAccommodations.ts`: `useTripAccommodations(tripId)`, `useCreateAccommodation()`, `useUpdateAccommodation()`, `useDeleteAccommodation()`, `useToggleIncludiInStima()` — all with optimistic + rollback
  - [ ] Create `src/hooks/useTripTransports.ts`: `useTripTransports(tripId)`, `useCreateTransport()`, `useUpdateTransport()`, `useDeleteTransport()` — all with optimistic + rollback
  - [ ] Overlap detection logic in `useTripAccommodations.ts`: before save/toggle, check for date overlap with existing accommodations client-side

- [ ] Task 5 - Build trip detail page with tabs (AC: 1–8)
  - [ ] Update `src/app/travel/[id]/page.tsx` to fetch trip by id and render tab layout with 4 tabs: Luoghi | Alloggi | Trasporti | Itinerario (Itinerario tab = placeholder for story 10.3)
  - [ ] Create `src/components/travel/TripDetailHeader.tsx` — shows trip name, dates, status, participant count, back button to `/travel`
  - [ ] Create `src/components/travel/TripDetailTabs.tsx` — tab switcher component

- [ ] Task 6 - Luoghi tab UI (AC: 1, 2, 3)
  - [ ] Create `src/components/travel/LuoghiTab.tsx` — filter bar (text search + tipo dropdown), sort by price button, place cards list
  - [ ] Create `src/components/travel/PlaceCard.tsx` — name, tipo badge (colored: ristorante=orange, bar=amber, attrazione=blue), prezzo, Maps link icon
  - [ ] Create `src/components/travel/PlaceFormModal.tsx` — fields: nome (required), tipo (select), maps_url, lat/lon (shown if parsing fails), descrizione, prezzo_per_persona; Leaflet map preview (dynamic import)
  - [ ] Implement filter + sort purely client-side on the query result (no re-fetch)

- [ ] Task 7 - Alloggi tab UI (AC: 4, 5)
  - [ ] Create `src/components/travel/AlloggiTab.tsx` — list of accommodation cards
  - [ ] Create `src/components/travel/AccommodationCard.tsx` — nome, check-in/out dates, prezzo_totale, "Includi in stima" toggle, Maps link, edit/delete
  - [ ] Create `src/components/travel/AccommodationFormModal.tsx` — fields: nome (required), check_in (required), check_out (required), prezzo_totale, link_booking, maps_url, includi_in_stima toggle
  - [ ] Overlap validation: check `[check_in, check_out)` intervals; show error inline on modal if overlapping; block save
  - [ ] Use `toLocalDateStr()` for all date comparisons in overlap logic

- [ ] Task 8 - Trasporti tab UI (AC: 7)
  - [ ] Create `src/components/travel/TrasportiTab.tsx` — two sections: "Trasporto per arrivare" (outbound) + "Trasporti locali" (locale)
  - [ ] Create `src/components/travel/TransportFormModal.tsx` — fields: nome (required), categoria (select: outbound/locale), prezzo, prezzo_tipo (select: per_persona/totale), descrizione

- [ ] Task 9 - Verification (AC: 1–8)
  - [ ] Run `npm.cmd run build` — zero TypeScript errors
  - [ ] Manual QA: add place with parseable Maps URL → Leaflet map shows; with non-parseable URL → manual lat/lon fields shown
  - [ ] Manual QA: overlapping accommodation dates → error shown, save blocked
  - [ ] Manual QA: includi_in_stima toggle conflict → reverts with error
  - [ ] Manual QA: delete place/accommodation/transport → removed from UI immediately, rollback if error

## Dev Notes

### Story Context

This story builds the trip detail content: three tabs (Luoghi, Alloggi, Trasporti). The Itinerario tab is a shell here — implemented fully in story 10.3. The `trip_accommodations` check-in/out events in the itinerary (AC 6) are generated dynamically in story 10.3, not stored in `trip_itinerary_items` — accommodations produce read-only, non-draggable items derived from `check_in`/`check_out` dates.

### Technical Requirements

- **react-leaflet SSR:** `dynamic(() => import('./PlaceMapPreview'), { ssr: false })` is MANDATORY. Direct import of any react-leaflet component causes Next.js build failure. This must be done for every component that uses `MapContainer`.
- **Leaflet CSS:** Import `leaflet/dist/leaflet.css` inside the dynamically-loaded file. Do NOT add it to `app/layout.tsx` or `globals.css` — it would always load.
- **Leaflet marker icon bug:** Webpack breaks Leaflet's default icon paths. Fix with `L.Icon.Default.mergeOptions({ iconUrl: require('leaflet/dist/images/marker-icon.png'), shadowUrl: require('leaflet/dist/images/marker-shadow.png') })` inside the component.
- **Short Maps URLs** (`maps.app.goo.gl/...`) cannot be parsed for coordinates without server-side redirect following. Always show manual fallback for these — do not attempt to fetch.
- **Overlap detection:** Intervals overlap if `check_in_A < check_out_B AND check_out_A > check_in_B`. Use `Date` objects from `toLocalDateStr()` parsed strings.
- **RLS on all three tables:** `DEFAULT auth.uid()` + `USING` + `WITH CHECK` — mandatory.
- **Optimistic updates + rollback mandatory** on all mutations.
- **Use `update()` not `upsert()`** for partial field updates.

### Architecture Compliance

- All Supabase queries in hooks (`src/hooks/`), never inside components.
- Components in `src/components/travel/`.
- Page update: `src/app/travel/[id]/page.tsx`.
- Utility: `src/lib/travel/mapsUrlParser.ts` (module-specific lib, not a generic `utils/`).

### Library/Framework Requirements

- `react-leaflet` + `leaflet` — dynamic import with `ssr: false` mandatory.
- TanStack Query v5 for all hooks.
- Supabase browser client for CRUD.
- Tailwind CSS glassmorphism dark theme.

### File Structure Requirements

- New: `src/lib/travel/mapsUrlParser.ts`
- New: `src/components/travel/PlaceMapPreview.tsx` (react-leaflet component)
- New: `src/components/travel/LuoghiTab.tsx`
- New: `src/components/travel/PlaceCard.tsx`
- New: `src/components/travel/PlaceFormModal.tsx`
- New: `src/components/travel/AlloggiTab.tsx`
- New: `src/components/travel/AccommodationCard.tsx`
- New: `src/components/travel/AccommodationFormModal.tsx`
- New: `src/components/travel/TrasportiTab.tsx`
- New: `src/components/travel/TransportFormModal.tsx`
- New: `src/components/travel/TripDetailHeader.tsx`
- New: `src/components/travel/TripDetailTabs.tsx`
- New: `src/hooks/useTripPlaces.ts`
- New: `src/hooks/useTripAccommodations.ts`
- New: `src/hooks/useTripTransports.ts`
- Modified: `src/app/travel/[id]/page.tsx` (add tabs + header)
- New: `supabase/migrations/YYYYMMDD_create_trip_places_accommodations_transports.sql`

### Testing Requirements

- Build: `npm.cmd run build` with zero TS errors.
- Verify `PlaceMapPreview` is only imported via `dynamic(..., { ssr: false })` — build fails otherwise.
- Manual QA all 8 ACs.
- Verify overlap validation for accommodations with same user, different trips (no cross-trip leakage).

### Implementation Guardrails

- Do NOT import `react-leaflet` components directly (no `import { MapContainer } from 'react-leaflet'` at module top level).
- Do NOT attempt HTTP requests to resolve short Maps URLs — manual lat/lon fallback only.
- Do NOT persist check-in/checkout itinerary events in `trip_itinerary_items` from this story — story 10.3 handles itinerary display.
- Do NOT use `upsert()` for partial updates.
- Do NOT block saving a place if coordinates are missing — coordinates are optional.

### Previous Story Intelligence

- Story 10.1 created `trips` table, `useTrips` hook, and the trip detail page shell at `src/app/travel/[id]/page.tsx`. Extend that shell — do not recreate.
- The `useTrips` hook in 10.1 establishes the pattern: `useQuery` + optimistic `useMutation` with rollback. Follow the same structure for `useTripPlaces`, `useTripAccommodations`, `useTripTransports`.
- The `src/lib/travel/` directory is new — create it for `mapsUrlParser.ts`.

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 10, Story 10.2 section (lines ~1618–1662) + Technical Notes (lines ~1502–1513)
- DB schema (all Epic 10 tables): `_bmad-output/planning_artifacts/epics.md` (lines ~1515–1581)
- Architecture patterns: `_bmad-output/planning_artifacts/architecture.md` (RLS, optimistic, hook structure)
- Date utility: `src/lib/dateUtils.ts` (`toLocalDateStr`)
- Optimistic update pattern reference: `src/hooks/useReminders.ts`
- Existing tab pattern: `src/app/fitness/page.tsx` (Strava / Corpo tabs)

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Completion Notes List

_to be filled by dev agent_

### File List

_to be filled by dev agent_

## Change Log

- 2026-03-26: Story created — Luoghi, Alloggi e Trasporti for Epic 10 Travel Planning Module.
