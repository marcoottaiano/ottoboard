# Story 11.2: Wishlist Organization & Public Sharing

Status: review

## Story

As a user,
I want to organize my wishlist by category or occasion and share it publicly,
so that friends and family can easily see what to gift me without requiring an account.

## Acceptance Criteria

1. **Given** the wishlist page **When** I add or edit an item **Then** I can assign an optional category/occasion label (free text or predefined: Compleanno, Natale, Generale, ecc.)

2. **Given** the wishlist page **When** I filter by category **Then** only items matching that category are shown.

3. **Given** the wishlist page **When** I click "Condividi lista" **Then** a unique public URL is generated: `/wishlist/[share_id]/public` **And** the URL is copyable to clipboard.

4. **Given** a visitor opens `/wishlist/[share_id]/public` **When** the page loads (no auth required) **Then** they see all items with name, photo, price (if set), and status **And** "Acquistato" and "Ricevuto" items are visually distinct (strikethrough or badge) **And** no edit or delete controls are visible **And** the page works without a Supabase session (public RLS policy where `is_public = TRUE`).

## Tasks / Subtasks

- [x] Task 1 — Add `category` field to `WishlistItemModal` (AC: 1)
  - [x] Update `src/components/wishlist/WishlistItemModal.tsx` — add optional `category` text field
  - [x] Predefined suggestions (shown as quick-select chips, not strict select): Compleanno, Natale, Generale, Casa, Tech, Abbigliamento — user can type freely or pick one
  - [x] The `category` column already exists in DB from Story 11.1 migration — NO new migration needed for this field
  - [x] Update `useCreateWishlistItem` and `useUpdateWishlistItem` mutations to pass `category`

- [x] Task 2 — Category filter on wishlist page (AC: 2)
  - [x] In `src/components/wishlist/WishlistPage.tsx`, add a horizontal chip/tab filter above the item list
  - [x] "Tutti" chip selected by default → shows all items
  - [x] Additional chips: one per distinct category present in the user's items (derived client-side from fetched data)
  - [x] Filter is purely client-side (no refetch) — filter the array from `useWishlistItems()` result
  - [x] When a category chip is selected → show only items with `category = selectedCategory`
  - [x] Items with `category = null` appear under "Tutti" but NOT under any specific category chip

- [x] Task 3 — Public sharing toggle (AC: 3)
  - [x] In `src/components/wishlist/WishlistPage.tsx`, add a "Condividi lista" button in the header
  - [x] Clicking "Condividi lista":
    - [x] Bulk update `is_public = true` on all user's items via `useToggleWishlistPublic`
    - [x] Show the public URL + copy-to-clipboard button
    - [x] If already public: show "Rendi privata" button to revoke
  - [x] Public URL uses `userId` as route param: `/wishlist/${userId}/public`
  - [x] Add `useToggleWishlistPublic()` mutation in `src/hooks/useWishlistItems.ts`

- [x] Task 4 — Public page `/wishlist/[userId]/public` (AC: 4)
  - [x] Create `src/app/wishlist/[userId]/public/page.tsx` — **server component** (no auth required)
  - [x] Fetch via anon Supabase client: `wishlist_items WHERE user_id = userId AND is_public = TRUE`
  - [x] `notFound()` if no public items found
  - [x] Render read-only view with photo, name, price, status badge — grouped by category if categories exist
  - [x] "Acquistato"/"Ricevuto" items: `line-through` + `opacity-60` visually distinct
  - [x] NO edit, delete, or "Condividi" buttons
  - [x] Standalone public layout: `src/app/wishlist/[userId]/layout.tsx`

- [x] Task 5 — Verification (AC: 1–4)
  - [x] Run `npm.cmd run build` — zero TypeScript errors ✅
  - [ ] Manual QA: add item with category → category chip appears in filter
  - [ ] Manual QA: filter by category → only matching items shown; "Tutti" → all items
  - [ ] Manual QA: click "Condividi lista" → URL appears in UI, copyable to clipboard
  - [ ] Manual QA: open public URL in incognito (not logged in) → read-only list visible, no edit controls
  - [ ] Manual QA: "Acquistato"/"Ricevuto" items have visual differentiation (strikethrough)
  - [ ] Manual QA: revoke sharing ("Rendi privata") → public URL returns 404 in incognito

## Dev Notes

### Prerequisites

**Story 11.1 MUST be complete** before this story. The `wishlist_items` table and `useWishlistItems` hook must already exist. The `category`, `is_public`, and `share_id` columns were added in Story 11.1 migration — no new migration needed.

### Architecture Compliance

Same module as Story 11.1 — extend existing files, do not recreate.

**Public page server component pattern** (mirrors Story 10.5 `/shared/[token]/page.tsx`):
```ts
// src/app/wishlist/[userId]/public/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function PublicWishlistPage({ params }) {
  const supabase = createClient()  // uses anon key + no session
  const { data: items } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', params.userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (!items || items.length === 0) return notFound()
  // render read-only view...
}
```

### Category Filter Implementation

Client-side only — no new API call:
```ts
const categories = [...new Set(items.filter(i => i.category).map(i => i.category))]
const filtered = selectedCategory === 'all' ? items : items.filter(i => i.category === selectedCategory)
```

### Public URL Strategy

The public URL uses the user's `user_id` (UUID) as the route parameter:
- URL: `${window.location.origin}/wishlist/${userId}/public`
- Where `userId` = `supabase.auth.getUser().data.user.id`
- This is safe: UUIDs are not guessable, and `is_public = FALSE` prevents enumeration
- **Do NOT** use `share_id` per-item as the route parameter — it would require joining items to find the user

### Clipboard Copy

Use the Web Clipboard API:
```ts
navigator.clipboard.writeText(url).then(() => {
  // show toast: "Link copiato negli appunti"
})
```
Show success toast (same `react-hot-toast` pattern used in Epic 10 sharing).

### Visual Differentiation for Completed Items

```tsx
// In public item rendering:
<span className={item.status === 'desiderato' ? '' : 'line-through opacity-50'}>
  {item.name}
</span>
<Badge variant={item.status === 'acquistato' ? 'green' : item.status === 'ricevuto' ? 'blue' : 'default'}>
  {item.status}
</Badge>
```

### File Structure Requirements

Modified files (from Story 11.1):
- `src/components/wishlist/WishlistItemModal.tsx` (add category field)
- `src/components/wishlist/WishlistPage.tsx` (add category filter + share button)
- `src/hooks/useWishlistItems.ts` (add `useToggleWishlistPublic`, update mutations to pass `category`)

New files:
- `src/app/wishlist/[userId]/public/page.tsx` (server component, no auth)
- `src/app/wishlist/[userId]/layout.tsx` (optional: public standalone layout)

No new migration needed — all columns added in Story 11.1.

### Implementation Guardrails

- Do NOT require auth on `/wishlist/[userId]/public` page
- Do NOT use browser Supabase client in the public server component page
- Do NOT call `notFound()` if the user exists but has 0 public items — treat as "not shared" (return 404 is correct per AC 4)
- Do NOT add edit/delete controls on the public page
- Do NOT use `toISOString().slice(0, 10)` for date handling
- Do NOT define a new migration for `category`/`is_public`/`share_id` — already in Story 11.1 migration

### Previous Story Intelligence

- Story 11.1 established the module structure, hook, and components — extend them
- Story 10.5 is the exact reference for the public server component pattern (read it at `_bmad-output/implementation-artifacts/10-5-itinerary-export-and-public-sharing.md`)
  - Key: use `createClient` from `src/lib/supabase/server.ts`, call `notFound()` from `next/navigation`
  - The `/shared/layout.tsx` may be reusable for the wishlist public page (no sidebar/nav)
- Category chip pattern: look at `src/components/finance/` — similar category filter exists for transactions

### References

- Epic source: `_bmad-output/planning_artifacts/epics.md` — Epic 11, Story 11.2 (lines ~1406–1433)
- Architecture: `_bmad-output/planning_artifacts/architecture.md` — public RLS, server component pattern
- Story 10.5: `_bmad-output/implementation-artifacts/10-5-itinerary-export-and-public-sharing.md` — public page pattern
- CLAUDE.md — public RLS pattern, `notFound()` usage, `share_token` mechanics
- `src/app/shared/[token]/page.tsx` — exact implementation reference for public server component

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Build error 1: `MapIterator` spread not allowed with current TS target → fixed with `Array.from(categoryMap.keys())`
- Build error 2: `Set` spread not allowed → fixed with `Array.from(new Set(...))`

### Completion Notes List

- `CreateWishlistItemInput` in `src/types/wishlist.ts` updated to include `category` field.
- `WishlistItemModal` extended with: `category` text input + 6 quick-select chip buttons (Compleanno, Natale, Generale, Casa, Tech, Abbigliamento). Clicking a chip toggles it — if already selected it deselects; user can also type freely.
- `useToggleWishlistPublic()` mutation added to `useWishlistItems.ts` — bulk `UPDATE wishlist_items SET is_public = ? WHERE user_id = userId`. Includes optimistic update (onMutate sets cache immediately) + rollback on error + cancelQueries (F3 code-review fix).
- `WishlistPage` updated with:
  - Category filter bar (horizontal chips, `overflow-x: auto` + `overflow-y: hidden` per CLAUDE.md gotcha)
  - "Condividi lista"/"Rendi privata" toggle — state uses `items.some(i => i.is_public)` so button persists when new item with default is_public=false is added (F1 fix)
  - `selectedCategory` auto-resets via useEffect when active category no longer exists in items (F2 fix)
  - `userId` resolved via `getSession()` (cached, no network round-trip) instead of `getUser()` — minimizes null-flash on first render (F4 fix)
  - `setCopied` timer stored in `useRef`, cleared in useEffect cleanup to prevent memory leak (F6 fix)
  - Public URL bar with copy-to-clipboard + sonner toast feedback
  - Empty filtered state message when filter yields no results
- `src/app/wishlist/[userId]/layout.tsx` (new) — standalone public layout, no sidebar/nav.
- `src/app/wishlist/[userId]/public/page.tsx` (new):
  - UUID validation on `params.userId` before Supabase query (F5 fix)
  - `categoryMap` grouping uses `.push()` instead of spread — O(n) instead of O(n²) (F7 fix)
  - Server component using anon `@supabase/supabase-js` client. Items grouped by category. Non-"desiderato" items rendered with `line-through` + `opacity-60`. Links safe-URL checked.
- `WishlistItemModal.tsx`: chip toggle uses `category.trim() === suggestion` — trim-safe comparison (F8 fix)
- Build: ✅ zero TypeScript errors. `/wishlist/[userId]/public` rendered as dynamic server route (153 B).

### File List

- `src/types/wishlist.ts` (modified — added `category` to `CreateWishlistItemInput`)
- `src/hooks/useWishlistItems.ts` (modified — added `useToggleWishlistPublic`)
- `src/components/wishlist/WishlistItemModal.tsx` (modified — added category field + chips)
- `src/components/wishlist/WishlistPage.tsx` (modified — category filter + share toggle + URL bar)
- `src/app/wishlist/[userId]/layout.tsx` (new)
- `src/app/wishlist/[userId]/public/page.tsx` (new)
