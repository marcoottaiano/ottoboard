# Story 4.6: Lock Transaction Category

Status: review

## Story

**As a user,**
I want to manually lock the category of a transaction so it is never auto-reassigned,
so that my manual categorization decisions are preserved during future imports or bulk operations.

## Acceptance Criteria

1. **Given** I open a transaction's edit modal, **When** I toggle "Blocca categoria", **Then** the transaction is saved with `category_locked = true` and a lock icon is visible on the transaction row.

2. **Given** a transaction has `category_locked = true`, **When** a bulk recategorize operation is applied to a selection that includes it, **Then** the locked transaction is skipped and a notice shows "X transazioni bloccate escluse".

3. **Given** I unlock a previously locked transaction, **When** I save the change, **Then** the lock icon disappears and the transaction is eligible for bulk recategorization again.

## Prerequisites / Dependencies

**Story 4.5 (Bulk Transaction Operations)** must be implemented alongside or before this story. Story 4.5 adds the `useBulkRecategorizeTransactions` mutation with a TODO comment for the locked-transaction filter. This story implements that filter.

If implementing in parallel, coordinate to avoid merge conflicts on `useFinanceMutations.ts` and `TransactionList.tsx`.

## Tasks / Subtasks

### Task 1: DB migration — add category_locked column

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_category_locked_to_transactions.sql`

- [x] **1.1** Create a new migration file with the current timestamp:
  ```sql
  ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS category_locked BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- [x] **1.2** Apply the migration locally (`supabase db reset` or `supabase migration up`).
- [x] **1.3** Regenerate Supabase TypeScript types: `supabase gen types typescript --local > src/lib/supabase/types.ts` (or the equivalent command in this project — check `package.json` scripts).

### Task 2: Update Transaction TypeScript interface

**File:** `src/types/index.ts`

- [x] **2.1** Add `category_locked: boolean` to the `Transaction` interface.
- [x] **2.2** Check `TransactionWithCategory` and any other derived types — add the field if not inherited.

### Task 3: Add lock toggle to TransactionEditModal

**File:** `src/components/finance/TransactionEditModal.tsx`

- [x] **3.1** Read the current `TransactionEditModal` implementation.
- [x] **3.2** Add a toggle row in the form (near the category field):
  - Label: "Blocca categoria"
  - Control: a toggle/switch or a checkbox. Use the existing checkbox pattern in the codebase (check how `HabitRow` or `ReminderRow` implements checkboxes).
  - Initialize toggle from `transaction.category_locked`.
- [x] **3.3** Include `category_locked` in the update payload when the user saves the modal.
  - Use `useUpdateTransaction()` mutation (from `useFinanceMutations.ts`).
  - Pass `{ category_locked: newLockedValue }` in the update.

### Task 4: Show lock icon on TransactionList rows

**File:** `src/components/finance/TransactionList.tsx`

- [x] **4.1** Import `Lock` icon from `lucide-react`.
- [x] **4.2** In the transaction row render, when `transaction.category_locked === true`, show a `<Lock size={10} />` icon next to the category name within the category badge.
- [x] **4.3** The icon should be visible but not intrusive — use `inline` positioning or a flex row within the category cell.

### Task 5: Update bulk recategorize to skip locked transactions

**File:** `src/hooks/useFinanceMutations.ts`

- [x] **5.1** Locate `useBulkRecategorizeTransactions` (added in Story 4.5).
- [x] **5.2** Before calling the Supabase bulk update, filter the `ids` array to exclude transactions where `category_locked = true`.
  - Get locked transaction ids from the React Query cache: `queryClient.getQueryData<Transaction[]>(['transactions', ...])`.
  - Filter: `const unlocked = ids.filter(id => !lockedIds.has(id))`.
  - If `unlocked.length === 0`, show a toast "Nessuna transazione modificabile — tutte bloccate" and return early.
- [x] **5.3** After the mutation succeeds, compute the count of skipped locked transactions and show a notice:
  - If `skipped > 0`: show toast "X transazioni bloccate escluse" (use the existing toast pattern).
- [x] **5.4** The Supabase query can also add a server-side guard as defense-in-depth:
  ```typescript
  supabase
    .from('transactions')
    .update({ category_id: newCategoryId })
    .in('id', unlocked)
    .eq('category_locked', false)  // extra safety
  ```

### Task 6: Update useUpdateTransaction to support partial updates

**File:** `src/hooks/useFinanceMutations.ts`

- [x] **6.1** Check that `useUpdateTransaction` supports partial field updates (i.e., it accepts `Partial<Transaction>` and only sends the provided fields).
- [x] **6.2** If it currently requires all fields, update the signature to accept `Partial<Pick<Transaction, 'amount' | 'type' | 'category_id' | 'description' | 'date' | 'category_locked'>>`. Added `category_locked?: boolean` to `UpdateTransactionInput`.

## Dev Notes

### Migration filename convention

Check existing migration files in `supabase/migrations/` to confirm the timestamp format. Use the current date/time: `20260322120000_add_category_locked_to_transactions.sql` (adjust timestamp to avoid conflicts).

### Regenerate Supabase types

After migration, regenerate types to add `category_locked` to the generated `Database` types. Check `package.json` for a `gen:types` or `db:types` script. If not present, run:
```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```
Then the manual `Transaction` interface in `src/types/index.ts` should also be updated.

### Toggle/switch component

Check `src/components/ui/` for an existing Switch or Toggle component. If none exists, use a simple checkbox styled as a toggle (Tailwind peer pattern or a div-based toggle). Keep it consistent with the onboarding/profile form patterns.

### TransactionEditModal current structure

`src/components/finance/TransactionEditModal.tsx` (~6.2 KB):
- Shows form fields: type, amount, category, date, description
- Has "Salva" and "Elimina" actions
- Uses `useUpdateTransaction` and `useDeleteTransaction` mutations

### Lock icon placement in transaction row

Place the `Lock` icon as a sibling to the category name badge:
```tsx
<span className="category-badge">
  {transaction.category?.name}
  {transaction.category_locked && <Lock size={12} className="inline ml-1 text-amber-400" />}
</span>
```

### Multi-select checkbox vs lock icon

In the multi-select mode (added in Story 4.5), locked transactions still show their checkbox (they CAN be selected for delete — only recategorize is blocked). Make sure the delete operation in Story 4.5 is NOT affected by `category_locked` (locking only prevents recategorization, not deletion — per the AC).

### RLS note

The `category_locked` column has `DEFAULT FALSE`, consistent with the RLS pattern. The existing `WITH CHECK (auth.uid() = user_id)` policy already covers updates to this column.

### Project Structure

```
src/
├── components/finance/
│   ├── TransactionEditModal.tsx    ← MODIFY (Task 3)
│   └── TransactionList.tsx         ← MODIFY (Task 4)
├── hooks/
│   └── useFinanceMutations.ts      ← MODIFY (Tasks 5, 6)
├── types/
│   └── index.ts                    ← MODIFY (Task 2)
supabase/migrations/
│   └── YYYYMMDDHHMMSS_add_category_locked_to_transactions.sql  ← CREATE (Task 1)
```

### References

- `src/components/finance/TransactionEditModal.tsx` — existing edit modal
- `src/components/finance/TransactionList.tsx` — transaction row rendering
- `src/hooks/useFinanceMutations.ts` — existing mutation patterns
- `src/types/index.ts` — Transaction interface at lines 36–46
- Story 4.5 — `useBulkRecategorizeTransactions` TODO comment
- CLAUDE.md §Supabase RLS — DEFAULT auth.uid() and WITH CHECK patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- TypeScript build error on `tempTx` in `useCreateTransaction` — fixed by adding `category_locked: false` to optimistic transaction object.

### Completion Notes List

- Created migration `20260323000000_add_category_locked_to_transactions.sql` with `ADD COLUMN IF NOT EXISTS category_locked BOOLEAN NOT NULL DEFAULT FALSE`.
- Added `category_locked: boolean` to `Transaction` interface; `TransactionWithCategory` inherits it via `Omit<Transaction, 'category'>`.
- `TransactionEditModal`: added `categoryLocked` local state initialized from `transaction.category_locked`; toggle button shows `Lock`/`LockOpen` icon (amber when locked); `category_locked` included in `updateTx.mutateAsync` payload.
- `TransactionList`: imported `Lock` icon; displayed inside category badge when `t.category_locked === true`.
- `useFinanceMutations` / `useBulkRecategorizeTransactions`: collects locked IDs from all React Query caches; filters `unlocked` array; shows `toast.error` if all locked; applies `.eq('category_locked', false)` server-side guard; shows `toast.info` with count if some skipped. `onMutate` also skips locked transactions in optimistic update.
- `UpdateTransactionInput` extended with `category_locked?: boolean`.
- All ACs satisfied: lock persisted (AC1), locked skipped during bulk recategorize with notice (AC2), unlock re-enables eligibility (AC3).
- Post-review patches applied: locked IDs computed once in `onMutate` (not duplicated in mutationFn), toasts moved to `onSuccess`, guard added to `handleConfirmRecategorize`, lock icon shown even when category is null.

### File List

- supabase/migrations/20260323000000_add_category_locked_to_transactions.sql (created)
- src/types/index.ts (modified)
- src/components/finance/TransactionEditModal.tsx (modified)
- src/components/finance/TransactionList.tsx (modified)
- src/hooks/useFinanceMutations.ts (modified)

## Change Log

- 2026-03-23: Story 4.6 implemented — lock/unlock category on transaction (toggle in edit modal, lock icon on row, bulk recategorize skip with toast notice).
