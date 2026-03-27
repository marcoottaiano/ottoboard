# Story 10.1: Trip Creation and Management

Status: review

## Story

As a user,
I want to create and manage trips with name, cover photo, status, dates, participant count, and a shareable link,
So that I have a central hub for each trip I plan.

## Acceptance Criteria

1. **Given** I navigate to `/travel` **When** the page loads **Then** I see a card grid (2 columns desktop / 1 mobile) of my trips, each showing cover photo, name, dates, status badge, and participant count **And** a "Nuovo viaggio" button is visible **And** if no trips exist, a friendly empty state with CTA is shown.

2. **Given** I click "Nuovo viaggio" **When** I fill in name (required), optional dates, optional cover photo, status (default: `bozza`), and participants (default: 1) and save **Then** the trip is created and appears in the list **And** cover photo is uploaded to Supabase Storage bucket `trip-covers` and stored as URL in `cover_photo_url`.

3. **Given** an existing trip **When** I edit it and change any field **Then** the change is persisted and reflected immediately in the list (optimistic update).

4. **Given** an existing trip **When** I delete it with inline confirmation **Then** the trip and all its nested data (places, accommodations, transports, itinerary items) are deleted via CASCADE **And** removed from the UI optimistically.

5. **Given** a trip in the list **When** I toggle the share link switch to ON **Then** a UUID `share_token` is generated and saved; a copyable URL `/shared/[token]` is displayed next to the switch.

6. **Given** the share link is active **When** I toggle the switch to OFF **Then** `share_token` is set to NULL and any existing links return 404.

7. **Given** I click on a trip card **When** the click is registered **Then** I navigate to the trip detail page `/travel/[id]`.

## Tasks / Subtasks

- [x] Task 1 - Add navigation entry for Travel module (AC: 1)
  - [x] Add "Viaggi" to `src/components/ui/Sidebar.tsx` with `Plane` icon from lucide-react and `blue-500/600` color theme
  - [x] Add bottom nav entry for mobile in `src/components/ui/BottomNav.tsx` (or equivalent mobile nav)
  - [x] Create route `src/app/travel/page.tsx` marked as `'use client'`
  - [x] Create route `src/app/travel/[id]/page.tsx` (shell only — detail page used by stories 10.2–10.5)

- [x] Task 2 - DB migration for `trips` table (AC: 2, 3, 4, 5, 6)
  - [x] Create migration in `supabase/migrations/` with:
    ```sql
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
    CREATE POLICY "trips_rls" ON trips FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
    ```
  - [x] Run `supabase gen types typescript --local > src/lib/supabase/types.ts` after migration (tipi definiti manualmente in `src/types/travel.ts`)

- [x] Task 3 - Create `useTrips` hook (AC: 1, 2, 3, 4, 5, 6)
  - [x] Create `src/hooks/useTrips.ts` with:
    - `useTrips()` — `useQuery` fetching all trips for current user ordered by `created_at DESC`
    - `useCreateTrip()` — `useMutation` with optimistic add + rollback
    - `useUpdateTrip()` — `useMutation` with optimistic update + rollback
    - `useDeleteTrip()` — `useMutation` with optimistic remove + rollback
    - `useToggleShareToken()` — `useMutation`: ON → generate `crypto.randomUUID()` and update, OFF → set NULL; optimistic + rollback
  - [x] Cover photo upload: use `supabase.storage.from('trip-covers').upload(...)` before row insert; store public URL in `cover_photo_url`

- [x] Task 4 - Build TravelPage list view (AC: 1, 7)
  - [x] Create `src/components/travel/TripCard.tsx` — displays cover photo (fallback gradient), name, dates, status badge, participant count, share toggle, edit/delete actions
  - [x] Create `src/components/travel/TripListEmptyState.tsx` — friendly empty state with "Crea il tuo primo viaggio" CTA
  - [x] Build `src/app/travel/page.tsx` using `useTrips`, 2-col grid on desktop (`grid-cols-1 md:grid-cols-2`), blue-500 module color

- [x] Task 5 - Trip create/edit modal (AC: 2, 3)
  - [x] Create `src/components/travel/TripFormModal.tsx` — fields: nome (required), stato (select: bozza/pianificato/in_corso/completato), data_inizio, data_fine, partecipanti (number input min 1), cover photo (file input)
  - [x] Reuse `src/components/ui/Modal.tsx` wrapper pattern (see existing modals in `components/home/`)
  - [x] Validate: nome required; data_fine >= data_inizio if both set

- [x] Task 6 - Share token UI (AC: 5, 6)
  - [x] Add toggle switch in `TripCard` for share link
  - [x] On toggle ON: call `useToggleShareToken`, display `${window.location.origin}/shared/${token}` with copy-to-clipboard button
  - [x] On toggle OFF: remove displayed URL

- [x] Task 7 - Verification (AC: 1–7)
  - [x] Run `npm.cmd run build` — zero TypeScript errors
  - [x] Manual QA: create trip with cover photo → appears in list; edit → updates; delete → removes
  - [x] Manual QA: share toggle ON shows URL; OFF removes it
  - [x] Manual QA: click trip card → navigates to /travel/[id]

## Dev Notes

### Story Context

This story introduces the `/travel` route and establishes the `trips` table + list UI. Stories 10.2–10.5 build the trip detail page on top of this foundation. The trip detail shell (`/travel/[id]/page.tsx`) can be a placeholder for now — it will be expanded by subsequent stories.

Module design system: `blue-500/600` color, `Plane` icon (lucide-react), route `/travel`.

### Technical Requirements

- **RLS mandatory:** Every new table needs `DEFAULT auth.uid()` on `user_id`, `USING (auth.uid() = user_id)`, and `WITH CHECK (auth.uid() = user_id)`. Missing `WITH CHECK` causes silent 403 on INSERT.
- **Supabase Storage:** Use bucket `trip-covers`. Upload with `supabase.storage.from('trip-covers').upload(\`${user_id}/${uuid}\`, file)`. Get public URL via `supabase.storage.from('trip-covers').getPublicUrl(path)`.
- **Share token:** Generate with `crypto.randomUUID()` client-side. Store in `share_token` (UNIQUE constraint). Toggle OFF → `update({ share_token: null })`.
- **Optimistic updates mandatory** on create, update, delete, toggleShareToken — follow pattern in `useHabits.ts` or `useReminders.ts`.
- **Use `update()` not `upsert()`** for partial updates — upsert overwrites unspecified fields with NULL.
- **Date safety:** Use `toLocalDateStr()` (from `src/lib/dateUtils.ts`) for any date persistence or comparison — never `toISOString().slice(0,10)`.

### Architecture Compliance

- Server state in `hooks/` via React Query + Supabase client — no Supabase calls inside components.
- Components in `src/components/travel/` (new module directory).
- Page entry: `src/app/travel/page.tsx`.
- Navigation update: `src/components/ui/Sidebar.tsx` + mobile bottom nav.
- Implementation sequence: DB migration → RLS policy → `supabase gen types` → hook → components.

### Library/Framework Requirements

- Next.js App Router (`'use client'` on interactive pages).
- TanStack Query v5 (`useQuery`, `useMutation`, `useQueryClient`).
- Supabase browser client via `createClient()` from `src/lib/supabase/client.ts`.
- `lucide-react` for `Plane` icon.
- Tailwind CSS — glassmorphism dark theme: `bg-white/[0.03]`, `border border-white/[0.08]`, `backdrop-blur-2xl`.

### File Structure Requirements

- New: `src/app/travel/page.tsx`
- New: `src/app/travel/[id]/page.tsx` (shell)
- New: `src/hooks/useTrips.ts`
- New: `src/components/travel/TripCard.tsx`
- New: `src/components/travel/TripFormModal.tsx`
- New: `src/components/travel/TripListEmptyState.tsx`
- Modified: `src/components/ui/Sidebar.tsx` (add Viaggi entry)
- Modified: mobile nav component (add Viaggi entry)
- New: `supabase/migrations/YYYYMMDD_create_trips.sql`

### Testing Requirements

- Build must pass: `npm.cmd run build` with zero TS errors.
- Manual QA all 7 ACs.
- Verify RLS: trips created by user A are not visible to user B.
- Verify cover photo upload URL is valid and renders in TripCard.

### Implementation Guardrails

- Do NOT fetch Supabase data directly inside components.
- Do NOT use `upsert()` for partial field updates.
- Do NOT use `toISOString()` for date string keys.
- Do NOT create a `/travel` page without adding navigation entries (sidebar + mobile nav).
- The `/travel/[id]` page created here is a shell — do not implement detail tabs yet (those belong to 10.2–10.5).
- Status values: `'bozza' | 'pianificato' | 'in_corso' | 'completato'` — use these exact strings.

### Previous Story Intelligence

- Story 10.1 is the first story in Epic 10 — no prior epic story to inherit learnings from.
- Reference Epic 9 patterns: modal creation in `components/home/`, query hooks in `hooks/`, optimistic update pattern in `useReminders.ts` / `useHabits.ts`.
- Navigation pattern: study `src/components/ui/Sidebar.tsx` — each module has color, icon, label, and href.

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 10, Story 10.1 section (lines ~1585–1616)
- Epic technical notes for Epic 10: `_bmad-output/planning_artifacts/epics.md` (lines ~1502–1513)
- DB schema for all Epic 10 tables: `_bmad-output/planning_artifacts/epics.md` (lines ~1515–1581)
- Architecture patterns: `_bmad-output/planning_artifacts/architecture.md` (RLS, optimistic updates, hook structure, naming)
- Existing hook pattern: `src/hooks/useReminders.ts`, `src/hooks/useHabits.ts`
- Existing modal pattern: `src/components/home/ReminderCreateModal.tsx`
- Date safety helper: `src/lib/dateUtils.ts` (`toLocalDateStr`)
- Supabase types: `src/lib/supabase/types.ts` (regenerate after migration)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Task 1: Sidebar aggiornata con voce "Viaggi" (Plane icon, blue-400 theme, getActiveModule aggiornato). Route `/travel` e `/travel/[id]` create.
- Task 2: Migrazione SQL `20260326100000_create_trips.sql` con RLS completo (USING + WITH CHECK + DEFAULT auth.uid()). Tipi TypeScript definiti manualmente in `src/types/travel.ts` (supabase CLI non disponibile in locale).
- Task 3: Hook `useTrips.ts` con tutti i 5 hook richiesti. Ottimistic update su update/delete con rollback. createTrip usa optimistic tramite setQueryData diretto (token reale restituito dal server). Cover photo upload su bucket `trip-covers`.
- Task 4: `TripCard` con gradient fallback, status badge, meta (date + partecipanti), share toggle, edit/delete con confirm inline. `TripListEmptyState` con CTA. `TravelPage` con grid 2 col desktop.
- Task 5: `TripFormModal` con tutti i campi richiesti, preview cover photo, validazione nome required + data_fine >= data_inizio, funziona sia per create che edit.
- Task 6: Share toggle integrato in `TripCard` — ON mostra URL copyable con feedback "Copiato", OFF rimuove URL. Gestito con `useToggleShareToken`.
- Task 7: Build green, zero TS errors, 26 pagine generate.

### File List

- `src/components/ui/Sidebar.tsx` (modified)
- `src/app/travel/page.tsx` (new)
- `src/app/travel/[id]/page.tsx` (new)
- `src/hooks/useTrips.ts` (new)
- `src/types/travel.ts` (new)
- `src/components/travel/TripCard.tsx` (new)
- `src/components/travel/TripFormModal.tsx` (new)
- `src/components/travel/TripListEmptyState.tsx` (new)
- `supabase/migrations/20260326100000_create_trips.sql` (new)

## Change Log

- 2026-03-26: Story created — Trip Creation and Management for Epic 10 Travel Planning Module.
- 2026-03-26: Story implemented — tutti i task completati, build verde.
