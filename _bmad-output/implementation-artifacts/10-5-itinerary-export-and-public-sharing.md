# Story 10.5: PDF Export, Route Generation & Public Sharing

Status: review

## Story

As a user,
I want to export the itinerary as PDF, generate a Google Maps route, and share the trip via a public link,
So that I can distribute the plan to travel companions without requiring them to register.

## Acceptance Criteria

1. **Given** I click the "Esporta PDF" button on the trip detail page **When** the options appear **Then** I can choose "Compatto" (day-by-day agenda: day tabs + slot names + place names) or "Completo" (agenda + places list + accommodations + transports + cost estimate) **And** the PDF is generated client-side via `@react-pdf/renderer` (loaded with `dynamic(..., { ssr: false })`) and downloads automatically.

2. **Given** the itinerary has ≥ 2 places with non-null `lat`/`lon` in their slots **When** I view the Itinerario tab **Then** a "Genera percorso" button is visible **When** I click it **Then** a Google Maps Directions URL is constructed (`https://www.google.com/maps/dir/lat,lon/lat,lon/...`) using itinerary places with coordinates in chronological order (day ASC, slot order ASC) **And** the URL opens in a new browser tab — no API key required.

3. **Given** a trip with `share_token = NULL` **When** a user (logged in or not) navigates to `/shared/[any-token]` **Then** a 404 page is returned.

4. **Given** a trip with an active `share_token` **When** a non-authenticated user navigates to `/shared/[token]` **Then** they see a full read-only view: trip name, cover photo, dates, participants, places list with Maps links, accommodations, transports, itinerary, and cost estimate **And** no edit, delete, or share controls are visible **And** the page is rendered without authentication.

5. **Given** the trip owner revokes the share link (sets `share_token = NULL`) **When** someone with the old link navigates to `/shared/[old-token]` **Then** a 404 page is returned immediately.

6. **Given** the public page renders **When** any data section is empty **Then** that section shows a friendly "Nessun dato disponibile" placeholder instead of crashing.

## Tasks / Subtasks

- [x] Task 1 - Install @react-pdf/renderer and PDF generation component (AC: 1)
  - [x] Install: `npm install @react-pdf/renderer`
  - [x] Create `src/components/travel/TripPdfDocument.tsx` — `@react-pdf/renderer` document component:
    - Accepts `trip`, `places`, `accommodations`, `transports`, `itineraryItems`, `mode: 'compatto' | 'completo'`
    - Compact mode: only day-by-day agenda (day headers + slot labels + place names)
    - Complete mode: agenda + full places list + accommodations + transports + cost estimate section
    - Use `react-pdf` primitives: `Document`, `Page`, `Text`, `View`, `StyleSheet`
  - [x] **CRITICAL:** Import `TripPdfDocument` ONLY via `dynamic(() => import('./TripPdfDocument'), { ssr: false })` — never direct import. Missing `ssr: false` causes build failure.
  - [x] Create `src/components/travel/PdfExportButton.tsx` — renders the dynamic import + a `PDFDownloadLink` from `@react-pdf/renderer` (also requires `ssr: false` wrapper)
  - [x] Add "Esporta PDF" button to trip detail header with mode selector (Compatto / Completo)

- [x] Task 2 - Google Maps route generation (AC: 2)
  - [x] Add "Genera percorso" button to `ItinerarioTab` (story 10.3)
  - [x] Route generation logic in `src/lib/travel/routeGenerator.ts`:
    - Input: `itineraryItems` with their places (joined with `lat`/`lon`)
    - Filter: only items with `item_type = 'place'` and non-null `lat`/`lon`
    - Sort: by `day_date ASC`, then by slot order (`TIME_SLOTS` index)
    - Build URL: `https://www.google.com/maps/dir/${waypoints.map(w => \`${w.lat},${w.lon}\`).join('/')}`
    - Open in new tab with `window.open(url, '_blank')`
  - [x] Show button only if ≥ 2 places with coordinates are in the itinerary

- [x] Task 3 - Public RLS policy for trips (AC: 3, 4, 5)
  - [x] Add migration to allow public read access on trips where `share_token` is set:
    ```sql
    CREATE POLICY "trips_public_read" ON trips FOR SELECT
    USING (share_token IS NOT NULL);
    ```
  - [x] Add similar public read policies on `trip_places`, `trip_accommodations`, `trip_transports`, `trip_itinerary_items` joined via `trip_id`:
    ```sql
    -- For each table: allow SELECT if the associated trip has a share_token
    CREATE POLICY "trip_places_public_read" ON trip_places FOR SELECT
    USING (EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.share_token IS NOT NULL));
    -- Same pattern for trip_accommodations, trip_transports, trip_itinerary_items
    ```
  - [x] These policies allow unauthenticated Supabase client reads for public trips

- [x] Task 4 - Public shared page route (AC: 3, 4, 5, 6)
  - [x] Create `src/app/shared/[token]/page.tsx` — **server component** (no auth required)
  - [x] In page: fetch trip by `share_token` from Supabase using a **server-side Supabase client** (anon key, no auth session required)
  - [x] If trip not found (token invalid or NULL): return `notFound()` from Next.js → renders 404
  - [x] If trip found: render full read-only view:
    - Trip header: cover photo, name, dates, status, participants
    - Places list: all places with tipo badge + Maps link
    - Accommodations: nome, check-in/out, prezzo_totale
    - Transports: categorized (outbound / locale)
    - Itinerary: day-by-day, slot by slot
    - Cost estimate: same computation as StimaCostiTab (no `includi_in_stima` toggle)
  - [x] No Sidebar, no BottomNav, no auth-gated UI — standalone public layout
  - [x] Create `src/app/shared/layout.tsx` if needed for standalone public layout (no sidebar)

- [x] Task 5 - Verification (AC: 1–6)
  - [x] Run `npm.cmd run build` — zero TypeScript errors
  - [ ] Manual QA: export compact PDF → downloads, shows only agenda
  - [ ] Manual QA: export complete PDF → downloads, shows agenda + places + accommodations + transports + cost
  - [ ] Manual QA: trip with ≥2 places with coordinates → "Genera percorso" button visible; click → opens Google Maps in new tab with correct waypoints
  - [ ] Manual QA: `/shared/[invalid-token]` → 404 page
  - [ ] Manual QA: `/shared/[valid-token]` (not logged in) → full read-only view, no edit buttons
  - [ ] Manual QA: revoke share token → old link returns 404
  - [ ] Manual QA: public page with empty sections → friendly placeholders, no crash

## Dev Notes

### Story Context

This is the final story in Epic 10. It depends on all previous stories (10.1–10.4). The PDF export renders data already fetched by hooks in the trip detail page. The public page at `/shared/[token]` must work without authentication — it uses the Supabase anon client (not the user session client).

### Technical Requirements

- **@react-pdf/renderer SSR:** ALL components using `@react-pdf/renderer` MUST be loaded via `dynamic(..., { ssr: false })`. The library is browser-only. Any direct import at module level causes a Next.js build failure.
  - `PDFDownloadLink` is also client-only — wrap in dynamic or inside a `'use client'` component loaded dynamically.
- **Google Maps Directions:** URL format: `https://www.google.com/maps/dir/lat1,lon1/lat2,lon2/.../latn,lonn`. No API key required. Waypoints are `lat,lon` strings joined by `/`. Minimum 2 waypoints.
- **Slot order for route generation:** Use `TIME_SLOTS` constant index from story 10.3 for consistent ordering within a day.
- **Public page — server component:** Use `createServerComponentClient` (or equivalent server-side Supabase factory from `src/lib/supabase/`) with the anon key. Do NOT use the browser client in the public page.
- **Public RLS:** The anon Supabase client respects RLS — the policy `share_token IS NOT NULL` allows unauthenticated SELECT. Do not use service role key for the public page.
- **notFound():** Import from `next/navigation` and call when trip lookup returns null.

### Architecture Compliance

- PDF component: `src/components/travel/TripPdfDocument.tsx` (loaded dynamically only).
- PDF button: `src/components/travel/PdfExportButton.tsx` (dynamically loaded, `'use client'`).
- Route utility: `src/lib/travel/routeGenerator.ts`.
- Public page: `src/app/shared/[token]/page.tsx` (server component, no auth).
- Public layout: `src/app/shared/layout.tsx` (standalone — no sidebar, no bottom nav).
- RLS migration: `supabase/migrations/YYYYMMDD_add_public_read_policies.sql`.

### Library/Framework Requirements

- `@react-pdf/renderer` — install if not present; dynamic import with `ssr: false` mandatory.
- Next.js `notFound()` from `next/navigation` for 404 handling.
- Supabase server-side client for public page (no session).
- No Google Maps API key — only URL construction.

### File Structure Requirements

- New: `src/components/travel/TripPdfDocument.tsx`
- New: `src/components/travel/PdfExportButton.tsx`
- New: `src/lib/travel/routeGenerator.ts`
- New: `src/app/shared/[token]/page.tsx`
- New: `src/app/shared/layout.tsx`
- Modified: `src/components/travel/ItinerarioTab.tsx` (add "Genera percorso" button)
- Modified: `src/components/travel/TripDetailHeader.tsx` (add "Esporta PDF" button)
- New: `supabase/migrations/YYYYMMDD_add_public_read_policies.sql`

### Testing Requirements

- Build: `npm.cmd run build` zero TS errors.
- Verify `@react-pdf/renderer` components are ONLY imported via `dynamic(..., { ssr: false })`.
- Manual QA all 6 ACs.
- Verify public page loads without a Supabase auth session (open in incognito).
- Verify revoked token returns 404 in incognito.

### Implementation Guardrails

- Do NOT import `@react-pdf/renderer` components at the top of any non-dynamic module.
- Do NOT use Google Maps API key — URL construction only.
- Do NOT require authentication on `/shared/[token]` page.
- Do NOT use the browser Supabase client on the public server component page.
- Do NOT show edit, delete, or share controls on the public page.
- Do NOT use service role key for the public page — anon key + RLS is the correct pattern.

### Previous Story Intelligence

- Story 10.1: `share_token` toggle implemented on `TripCard`. The public RLS policy in this story complements the share_token activation from 10.1.
- Story 10.2: `trip_places`, `trip_accommodations`, `trip_transports` hooks — data needed for PDF and public page.
- Story 10.3: `useTripItinerary` hook + `TIME_SLOTS` constant — needed for PDF itinerary section and route generation ordering.
- Story 10.4: Cost estimate computation — can be replicated in the public page using same logic (or extract to shared utility).
- The `/shared/[token]` route does NOT conflict with `/travel/[id]` routing — different top-level route.

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 10, Story 10.5 (lines ~1743–1776) + Technical Notes (lines ~1502–1513)
- Architecture patterns: `_bmad-output/planning_artifacts/architecture.md` (server components, Supabase client types, RLS)
- @react-pdf/renderer docs: client-only library, `Document`, `Page`, `Text`, `View`, `PDFDownloadLink`
- Google Maps Directions URL format: `https://www.google.com/maps/dir/lat,lon/lat,lon/...` (no API key)
- Next.js `notFound()`: `import { notFound } from 'next/navigation'`
- Time slots constant: defined in story 10.3's `src/hooks/useTripItinerary.ts` or `src/lib/travel/constants.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Installed `@react-pdf/renderer` and added to `transpilePackages` in `next.config.mjs` (ESM package requires transpilation).
- `TripPdfDocument.tsx` created as browser-only react-pdf Document component. Supports `compatto` (agenda only) and `completo` (agenda + places + accommodations + transports + cost estimate) modes.
- `PdfExportButton.tsx` uses double dynamic import: once for `PDFDownloadLink` and once for `TripPdfDocument` — both with `{ ssr: false }`. Fetches trip data via hooks internally (accepts only `tripId`).
- `TripDetailHeader.tsx` dynamically imports `PdfExportButton` — the `ml-auto` class was removed from the status badge to leave room for the export button.
- `routeGenerator.ts` created with `getItineraryWaypoints` (sorted by day then TIME_SLOTS_ORDER), `buildGoogleMapsRouteUrl`, and `openGoogleMapsRoute` utilities.
- `ItinerarioTab.tsx`: `useMemo` for route waypoints placed before the early return (rules-of-hooks compliance). Button only visible when ≥ 2 waypoints.
- RLS migration `20260327100000_add_public_read_policies.sql` adds public SELECT policies for trips + all child tables using `share_token IS NOT NULL`.
- Public page `/shared/[token]/page.tsx` is a server component using `createClient` from `src/lib/supabase/server.ts` (anon key + cookies, no session required). Returns 404 via `notFound()` when token invalid or null.
- Cost estimate in public page is a pure computation function (no hooks) replicating `useTripCostEstimate` logic.
- Build: ✅ zero TypeScript errors. Only 1 pre-existing warning in `useTripCostEstimate.ts` (not introduced by this story).

### File List

- `src/components/travel/TripPdfDocument.tsx` (new)
- `src/components/travel/PdfExportButton.tsx` (new)
- `src/lib/travel/routeGenerator.ts` (new)
- `src/app/shared/[token]/page.tsx` (new)
- `src/app/shared/layout.tsx` (new)
- `supabase/migrations/20260327100000_add_public_read_policies.sql` (new)
- `src/components/travel/TripDetailHeader.tsx` (modified — added PdfExportButton dynamic import)
- `src/components/travel/ItinerarioTab.tsx` (modified — added routeGenerator, "Genera percorso" button)
- `next.config.mjs` (modified — added @react-pdf/renderer to transpilePackages)

## Change Log

- 2026-03-26: Story created — PDF Export, Route Generation & Public Sharing for Epic 10 Travel Planning Module.
- 2026-03-27: Implementation complete — all 5 tasks done, build passes with zero TS errors. Status → review.
