# Story 4.5: Bulk Transaction Operations

Status: ready-for-dev

## Story

**As a user,**
I want to select multiple transactions and delete or recategorize them in one action,
so that I can clean up or organize my transaction history efficiently.

## Acceptance Criteria

1. **Given** I am on the transaction list in /finance, **When** I enable multi-select mode (checkbox on each row appears), **Then** I can select multiple transactions across the visible page.

2. **Given** I have selected one or more transactions, **When** I click "Elimina selezionati", **Then** an inline confirm appears; on confirm, all selected transactions are deleted and the list updates.

3. **Given** I have selected one or more transactions, **When** I click "Cambia categoria" and select a new category, **Then** all selected transactions are updated to the new category in a single operation.

4. **Given** I am in multi-select mode and deselect all items, **When** the selection count reaches zero, **Then** multi-select mode exits automatically.

## Prerequisites / Dependencies

**Story 4.6 (Lock Transaction Category)** adds a `category_locked` boolean to transactions. The bulk recategorize operation (AC 3) must skip locked transactions. Since the `category_locked` column does not yet exist, this story should be implemented BEFORE Story 4.6 OR coordinated with it:

**Option A (recommended):** Implement 4.5 first. Add a TODO comment in the bulk recategorize handler: `// TODO(4.6): skip transactions where category_locked = true`. Then implement 4.6 separately and update this handler.

**Option B:** Implement 4.6 first to add the `category_locked` column, then implement 4.5 with the lock check already in place.

The dev team should choose Option A or B explicitly. This story assumes **Option A** — locked transaction handling is deferred to Story 4.6.

## Tasks / Subtasks

### Task 1: Add multi-select mode to TransactionList

**File:** `src/components/finance/TransactionList.tsx`

- [ ] **1.1** Add state: `isMultiSelect: boolean` (default false) and `selectedIds: Set<string>` (default empty).
- [ ] **1.2** Add a "Seleziona" toggle button in the list header (next to or near the filters). On click: `setIsMultiSelect(true)`. Show a "Annulla" button when in multi-select mode to exit (clears selection, sets `isMultiSelect` to false).
- [ ] **1.3** When `isMultiSelect` is true:
  - Render a checkbox in the first cell of each transaction row.
  - On checkbox change: add/remove the transaction `id` from `selectedIds`.
- [ ] **1.4** Add a "select all on page" checkbox in the table header row (first column) that toggles all currently visible transactions.
- [ ] **1.5** Auto-exit multi-select when `selectedIds` becomes empty (AC 4): in a `useEffect`, if `isMultiSelect && selectedIds.size === 0`, set `isMultiSelect(false)`. Note: do NOT auto-exit on initial entry, only after items were selected and then deselected.

### Task 2: Add bulk action toolbar

**File:** `src/components/finance/TransactionList.tsx`

- [ ] **2.1** When `selectedIds.size > 0`, show a floating or sticky action toolbar above (or below) the list with:
  - "{N} selezionate" count label.
  - "Elimina selezionati" button (destructive, red).
  - "Cambia categoria" button (secondary).
- [ ] **2.2** The toolbar should be visually distinct — a semi-transparent bar that overlays or floats, similar to other selection UIs in the app.

### Task 3: Implement bulk delete

**File:** `src/components/finance/TransactionList.tsx` + `src/hooks/useFinanceMutations.ts`

- [ ] **3.1** Add `useBulkDeleteTransactions` mutation to `useFinanceMutations.ts`:
  ```typescript
  // Deletes multiple transactions by id array
  // Uses Promise.all for concurrent deletes OR a single RPC if available
  ```
  - Prefer: `supabase.from('transactions').delete().in('id', ids)` — Supabase supports `in()` filter for bulk delete in a single request.
  - Invalidate `['transactions']` on settle.
- [ ] **3.2** In `TransactionList`, when user clicks "Elimina selezionati":
  - Show inline confirm state: replace the button text with "Conferma eliminazione" (red) + "Annulla" (secondary) — do NOT use a modal dialog.
  - On confirm: call `bulkDelete.mutate([...selectedIds])`.
  - On success: clear `selectedIds`, exit multi-select.
- [ ] **3.3** Optimistic update: remove the selected transactions from the list immediately, restore on error.

### Task 4: Implement bulk recategorize

**File:** `src/components/finance/TransactionList.tsx` + `src/hooks/useFinanceMutations.ts`

- [ ] **4.1** Add `useBulkRecategorizeTransactions` mutation to `useFinanceMutations.ts`:
  - Use: `supabase.from('transactions').update({ category_id: newCategoryId }).in('id', ids)` — single request.
  - Invalidate `['transactions']` on settle.
  - **TODO(4.6):** add `.not('category_locked', 'eq', true)` filter when category_locked column exists. For now, update all selected without filtering.
- [ ] **4.2** In `TransactionList`, when user clicks "Cambia categoria":
  - Show an inline category selector (use the existing `Select` component from `components/ui/`) below the toolbar.
  - Filter categories to show only expense categories (since bulk recategorize makes sense for expense transactions; if mixed selection, show all categories).
  - On category selected: call `bulkRecategorize.mutate({ ids: [...selectedIds], categoryId })`.
  - On success: clear `selectedIds`, exit multi-select.
- [ ] **4.3** Optimistic update: update `category_id` on all selected transactions in the cache immediately, restore on error.

## Dev Notes

### TransactionList current structure

`src/components/finance/TransactionList.tsx` (~5.2 KB):
- Paginated table (20 rows/page) with filters: type, period, category
- Row click → opens `TransactionEditModal`
- Uses `useTransactions(selectedMonth, filters)` hook
- Renders table with columns: date, category, description, amount, type badge

### Where to add the "Seleziona" toggle

In the filter bar or the section header. Keep the layout clean — consider placing it as an icon button with tooltip rather than a full text button to save space on mobile.

### Mobile consideration

On mobile (< md), the action toolbar should be fixed at the bottom of the viewport (similar to the bottom navigation pattern). On desktop, it can be a sticky bar at the top of the list container.

### Supabase bulk operations

Supabase PostgREST supports:
- Bulk delete: `.delete().in('id', idsArray)` — single HTTP request ✅
- Bulk update: `.update({ field: value }).in('id', idsArray)` — single HTTP request ✅

Both are more efficient than `Promise.all(ids.map(...))`. Use these.

### Inline confirm pattern

The existing codebase uses inline confirm (not modal) for destructive actions — see `WidgetShell` remove button which shows an inline "Conferma / Annulla" toggle. Follow the same pattern.

### Selection state and pagination

Multi-select state should be scoped to the currently visible page. When the user navigates to the next page, maintain the `selectedIds` Set (ids persist across page navigation), but the visible checkboxes only show for the current page's transactions.

### No DB migration required

No schema changes for this story. The `category_locked` column from Story 4.6 will be handled in a separate migration.

### Project Structure

```
src/
├── components/finance/
│   └── TransactionList.tsx         ← MODIFY (Tasks 1, 2, 3, 4)
├── hooks/
│   └── useFinanceMutations.ts      ← MODIFY (Tasks 3.1, 4.1: add bulk mutations)
```

### References

- `src/components/finance/TransactionList.tsx` — full existing implementation
- `src/hooks/useFinanceMutations.ts` — existing mutation patterns to follow
- `src/components/ui/Select.tsx` — for inline category selector
- Story 4.6 — will add `category_locked` check to bulk recategorize
- CLAUDE.md §Gotcha — Select dropdown and overflow-hidden warning

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
