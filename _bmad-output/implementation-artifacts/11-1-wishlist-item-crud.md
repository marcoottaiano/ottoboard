# Story 11.1: Wishlist Item CRUD

Status: review

## Story

As a user,
I want to add, edit, and delete items in my wishlist with name, link, price, and photo,
so that I have a single place to track what I want to buy or receive as a gift.

## Acceptance Criteria

1. **Given** a new `/wishlist` route **When** I navigate to it **Then** I see my wishlist items (empty state if none) **And** a "+ Aggiungi" button is visible.

2. **Given** the item creation form **When** I enter name (required), and optionally link, price, and photo URL **Then** the item is saved to a new `wishlist_items` table (RLS: `user_id DEFAULT auth.uid()`) **And** appears in the list with photo thumbnail if provided.

3. **Given** an existing item **When** I click its status badge **Then** I can cycle through: "Desiderato" → "Ricevuto" → "Acquistato" **And** the status change is persisted immediately (optimistic update).

4. **Given** an existing item **When** I delete it with inline confirm **Then** it is removed from UI and DB.

## Tasks / Subtasks

- [x] Task 1 — DB Schema + Migration (AC: 2)
  - [x] Create `supabase/migrations/YYYYMMDD_create_wishlist_items.sql`:
    ```sql
    CREATE TABLE wishlist_items (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL DEFAULT auth.uid(),
      name         TEXT NOT NULL,
      link         TEXT,
      price        DECIMAL(10,2),
      photo_url    TEXT,
      status       TEXT NOT NULL DEFAULT 'desiderato', -- 'desiderato' | 'ricevuto' | 'acquistato'
      category     TEXT,                               -- free text (Story 11.2 uses this)
      is_public    BOOLEAN NOT NULL DEFAULT FALSE,     -- for public sharing (Story 11.2 uses this)
      share_id     UUID UNIQUE DEFAULT gen_random_uuid(), -- stable public URL token (Story 11.2)
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can only see their own wishlist items"
    ON wishlist_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    -- Public read policy (used by Story 11.2 public page)
    CREATE POLICY "Public read for shared wishlists"
    ON wishlist_items FOR SELECT
    USING (is_public = TRUE);
    ```
  - [x] Run `npx supabase gen types typescript --local > src/lib/supabase/types.ts` (or equivalent) to update TypeScript types.
  - [x] **NOTE:** `category`, `is_public`, `share_id` columns are added NOW to avoid a second migration in Story 11.2.

- [x] Task 2 — Navigation: Add `/wishlist` to sidebar + bottom nav (AC: 1)
  - [x] Add route link in `src/components/ui/Sidebar.tsx` (or wherever sidebar nav items are defined)
  - [x] Add route link in bottom nav component for mobile
  - [x] Use color: `rose` (module color — pick `rose-400/500` consistent with other modules: orange=fitness, emerald=finance, teal=habits, sky=profile)
  - [x] Icon: `Gift` from Lucide
  - [x] Label: "Wishlist"

- [x] Task 3 — `useWishlistItems` hook (AC: 1, 2, 3, 4)
  - [x] Create `src/hooks/useWishlistItems.ts` using React Query (TanStack v5):
    - `useWishlistItems()` — fetch all items for current user, ordered by `created_at DESC`
    - `useCreateWishlistItem()` — insert mutation, invalidates query on success
    - `useUpdateWishlistItem()` — update mutation with optimistic update for status cycling
    - `useDeleteWishlistItem()` — delete mutation, invalidates query on success
  - [x] Status optimistic update pattern (same as `useToggleCompletion` in habits):
    ```ts
    // On status toggle: setQueryData immediately, rollback on error
    const previousItems = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, (old) => old.map(item =>
      item.id === id ? { ...item, status: newStatus } : item
    ))
    // onError: queryClient.setQueryData(queryKey, previousItems)
    ```
  - [x] Status cycle logic: `desiderato → ricevuto → acquistato → desiderato`

- [x] Task 4 — `/wishlist` Page + Components (AC: 1, 2, 3, 4)
  - [x] Create `src/app/wishlist/page.tsx` — client component (`'use client'`), uses `useWishlistItems()` hook
  - [x] Create `src/components/wishlist/WishlistPage.tsx` — main container:
    - Header: title "Wishlist" + "+ Aggiungi" button
    - List of `WishlistItemCard` components
    - Empty state when no items: friendly placeholder with CTA
  - [x] Create `src/components/wishlist/WishlistItemCard.tsx`:
    - Shows: photo thumbnail (if `photo_url`), name, price (if set), link icon (if `link`), status badge
    - Status badge: clickable, cycles through statuses with optimistic update
    - Delete: inline confirm (same pattern as habits `HabitRow` delete)
    - Edit: click item → opens `WishlistItemModal` in edit mode
  - [x] Create `src/components/wishlist/WishlistItemModal.tsx` — create/edit modal:
    - Fields: name (required), link (optional, type=url), price (optional, type=number), photo_url (optional)
    - `category` field OMITTED in this story (added in Story 11.2)
    - Validation: name non-empty before submit
    - Submit calls `useCreateWishlistItem` or `useUpdateWishlistItem`

- [x] Task 5 — Verification (AC: 1–4)
  - [x] Run `npm.cmd run build` — zero TypeScript errors ✅
  - [ ] Manual QA: navigate to `/wishlist` → empty state visible
  - [ ] Manual QA: add item with all fields → appears in list with photo thumbnail
  - [ ] Manual QA: add item with only name → appears without photo/price/link
  - [ ] Manual QA: click status badge → cycles correctly, updates DB
  - [ ] Manual QA: delete item with confirm → removed from UI and DB
  - [ ] Manual QA: edit item → changes persist

## Dev Notes

### Architecture Compliance

Follow the standard per-module implementation sequence:
1. DB schema + migration (with `DEFAULT auth.uid()` + RLS USING + WITH CHECK)
2. TypeScript types regeneration
3. Hook (React Query)
4. Components (feature-based, dark glassmorphism)

**CRITICAL — RLS Pattern (CLAUDE.md):**
- Every new table MUST have `DEFAULT auth.uid()` on `user_id` — otherwise INSERT fails silently with 403
- Policy MUST have BOTH `USING (auth.uid() = user_id)` AND `WITH CHECK (auth.uid() = user_id)`

### Module Design Token

Color module: `rose` (rosa/rosso — gift/wishlist semantic).
Glassmorphism pattern: `bg-white/[0.03]`, `border border-white/[0.08]`, `backdrop-blur-2xl` (consistent with habits/finance pages).

### DB Column Pre-population for Story 11.2

Add `category TEXT`, `is_public BOOLEAN NOT NULL DEFAULT FALSE`, and `share_id UUID UNIQUE DEFAULT gen_random_uuid()` in this migration to avoid a breaking migration in Story 11.2. Story 11.2 will use these columns without needing a new migration.

### Hook Pattern Reference

Follow the exact same React Query v5 pattern established in recent stories:
- Query key: `['wishlist-items', userId]`
- `useMutation` with `onMutate` (optimistic) + `onError` (rollback) + `onSettled` (invalidate)
- Hook file: `src/hooks/useWishlistItems.ts`

### Navigation Integration

Check how habits nav was added — look at `src/components/ui/Sidebar.tsx` and the mobile bottom nav component. The wishlist link goes between habits and profile (or at the end of module links).

### TypeScript Types

After migration, regenerate types:
```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```
Or use local: `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
Use the `WishlistItem` type from generated types — do NOT define manual interface that can drift from DB.

### File Structure Requirements

New files:
- `supabase/migrations/YYYYMMDD_create_wishlist_items.sql`
- `src/app/wishlist/page.tsx`
- `src/components/wishlist/WishlistPage.tsx`
- `src/components/wishlist/WishlistItemCard.tsx`
- `src/components/wishlist/WishlistItemModal.tsx`
- `src/hooks/useWishlistItems.ts`

Modified files:
- `src/components/ui/Sidebar.tsx` (add wishlist nav item)
- Mobile bottom nav component (add wishlist nav item)
- `src/lib/supabase/types.ts` (regenerate after migration)

### Implementation Guardrails

- Do NOT use `toISOString().slice(0, 10)` for date handling — use `toLocalDateStr()` (see CLAUDE.md gotcha)
- Do NOT use upsert with partial fields — use `update()` for partial updates (CLAUDE.md gotcha)
- Do NOT mutate existing state — always return new objects from optimistic update reducer
- Do NOT add `overflow-x: auto` without `overflow-y-hidden` on the same element (CLAUDE.md gotcha)
- The `share_id` column is added NOW but NOT exposed in the UI yet (Story 11.2 uses it)

### Previous Story Intelligence (Epic 10)

- Story 10.5 established the public sharing pattern with `share_token` — Epic 11 uses `is_public + share_id` instead (different semantics: toggle visibility vs token URL)
- Travel page components in `src/components/travel/` show the established modal/card pattern for CRUD
- Status badge cycling pattern: look at `src/components/habits/HabitRow.tsx` for inline optimistic toggle

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 11, Story 11.1 (lines ~1377–1403)
- Architecture: `_bmad-output/planning_artifacts/architecture.md` — RLS pattern, hook pattern, file structure
- CLAUDE.md — Supabase RLS gotcha, timezone gotcha, upsert gotcha
- Habits module: `src/components/habits/` — reference for toggle/delete patterns
- Travel module: `src/components/travel/` — reference for modal/card CRUD patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Migration `20260330000000_create_wishlist_items.sql` created with all required columns including `category`, `is_public`, `share_id` (pre-populated for Story 11.2 to avoid a second migration).
- Types defined manually in `src/types/wishlist.ts` (pattern consistent with `src/types/habits.ts`) since the project does not use Supabase generated types.
- Hook `useWishlistItems.ts` exports: `useWishlistItems`, `useCreateWishlistItem`, `useUpdateWishlistItem`, `useDeleteWishlistItem`, `useCycleWishlistStatus` (optimistic, with rollback on error).
- `useDeleteWishlistItem` upgraded to optimistic delete (onMutate removes from cache immediately, onError restores).
- `useCycleWishlistStatus` — `newStatus` typed as `WishlistItemStatus` (not `string`) for type safety.
- Status cycle logic centralized in `src/types/wishlist.ts` as `nextStatus()` function.
- Sidebar updated with `Gift` icon, `rose` color token, `/wishlist` route (inserted between Viaggi e Profilo). Both desktop sidebar and bottom mobile nav updated via shared `NAV_ITEMS` array.
- Build: ✅ zero TypeScript errors. `/wishlist` rendered as static route (3.96 kB).
- **Code review fixes applied (10 findings):**
  - F1 (High): XSS via javascript: URI — added `isSafeUrl()` in `WishlistItemCard`, link only rendered as href if http/https.
  - F2 (High): Delete hidden on mobile — changed to `md:opacity-0 md:group-hover:opacity-100` (always visible on mobile).
  - F3 (High): `confirmDelete` not reset on error — added `onError: () => setConfirmDelete(false)` in `handleDelete`.
  - F4 (High): No error UI on query failure — added `isError` branch in `WishlistPage`.
  - F5 (High): Mutation errors silently swallowed — added `onError` callback in modal to show server error message.
  - F6 (Med): `newStatus: string` → `WishlistItemStatus` in hook.
  - F7 (Med): Optimistic delete added to `useDeleteWishlistItem`.
  - F8 (Med): `type="url"` → `type="text"` on link and photo_url inputs to allow URLs without protocol.
  - F9 (Low): `STATUS_COLORS` keyed as `Record<WishlistItemStatus, string>` for exhaustiveness.
  - F10 (Low): `aria-label` added to status badge and delete buttons.

### File List

- `supabase/migrations/20260330000000_create_wishlist_items.sql` (new)
- `src/types/wishlist.ts` (new)
- `src/hooks/useWishlistItems.ts` (new)
- `src/app/wishlist/page.tsx` (new)
- `src/components/wishlist/WishlistPage.tsx` (new)
- `src/components/wishlist/WishlistItemCard.tsx` (new)
- `src/components/wishlist/WishlistItemModal.tsx` (new)
- `src/components/ui/Sidebar.tsx` (modified — added wishlist nav item + getActiveModule branch)
