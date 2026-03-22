# Story 4.1: Manual Transaction Entry

Status: review

## Story

**As a user,**
I want to manually record income and expense transactions with category, amount, and date,
so that I can track all my financial movements in one place.

## Acceptance Criteria

1. **Given** I open the transaction form in /finance, **When** I fill in amount (positive), type (income/expense), category, date, and optional description and click Save, **Then** the transaction is saved to the `transactions` table and appears immediately in the list (optimistic update).

2. **Given** I submit the form with a missing required field (amount, type, category, or date), **When** the validation runs inline at the field level, **Then** an error message is shown at the specific field without submitting the form.

3. **Given** I save a transaction successfully, **When** the mutation settles, **Then** the monthly header (total income, total expenses, balance) updates to reflect the new transaction.

## Implementation Status Assessment

**AC 1 is partially implemented.** `TransactionForm.tsx` submits via `useCreateTransaction()` and resets fields on success. However the mutation does **not** include optimistic update — it calls `useCreateTransaction()` which invalidates queries on `onSuccess`, relying on refetch rather than instant list update.

**AC 2 is partially implemented.** `TransactionForm` shows a generic error state (`setError(msg)`) but does NOT perform inline per-field validation — the error message is displayed in a single block at the top of the form, not adjacent to the specific invalid field.

**AC 3 is partially implemented.** `MonthlyHeader` uses `useMonthStats()` which is invalidated by `useCreateTransaction.onSuccess`, so it re-fetches after save. However there is a visible loading flicker because there is no optimistic update on the stats query.

The story's scope is therefore: add inline field-level validation to `TransactionForm`, add optimistic update to `useCreateTransaction`, and verify that `MonthlyHeader` reflects the change without flicker.

## Tasks / Subtasks

### Task 1: Add inline field-level validation to TransactionForm

**File:** `src/components/finance/TransactionForm.tsx`

- [x] **1.1** Replace the single `error` state string with per-field error state object: `{ amount?: string; category?: string; date?: string }`.
- [x] **1.2** In the submit handler, validate each required field before calling `createTx.mutate()`. Set the per-field error if the value is missing or invalid (e.g., amount ≤ 0).
- [x] **1.3** Render each field's error message directly below its input (e.g., `<p className="text-xs text-red-400 mt-1">{errors.amount}</p>`).
- [x] **1.4** Clear the specific field's error when the user modifies that field (onChange clears error for that key).
- [x] **1.5** Remove the old top-level error `<p>` block.

### Task 2: Add optimistic update to useCreateTransaction

**File:** `src/hooks/useFinanceMutations.ts`

- [x] **2.1** In `useCreateTransaction`, add `onMutate` callback that:
  - Cancels in-flight queries for `['transactions', ...]`.
  - Snapshots the current query data with `queryClient.getQueryData`.
  - Calls `queryClient.setQueryData` to prepend the new transaction (with a temporary id like `'temp-' + Date.now()`) to the transactions list.
  - Returns `{ previousData }` as context for rollback.
- [x] **2.2** Add `onError` callback that calls `queryClient.setQueryData` to restore the previous snapshot.
- [x] **2.3** Add `onSettled` callback that invalidates `['transactions', ...]` to ensure server state is synced.
- [x] **2.4** The temporary transaction object must include `category` populated from the category id (lookup from `useCategories` cache) so the row renders correctly in `TransactionList`.

### Task 3: Verify MonthlyHeader update

**File:** `src/hooks/useMonthStats.ts` (read-only verification)

- [x] **3.1** Confirm that `useMonthStats` is in the same query invalidation scope as `['transactions', ...]`. If it derives data from transactions server-side, the existing `onSuccess` invalidation in `useCreateTransaction` is sufficient. If not, add it to the `onSettled` invalidation list.
- [x] **3.2** No optimistic update needed on MonthlyHeader — the invalidate + refetch is fast enough and a brief loading state (skeleton) is acceptable per the existing UI pattern.

## Dev Notes

### Existing TransactionForm structure

`src/components/finance/TransactionForm.tsx` (~129 lines):
- State: `type` (income/expense), `amount`, `categoryId`, `date`, `description`, `error` (single string)
- Submit guard: `if (!amount || !categoryId)` → sets `error`
- On success: resets amount, description, date to today
- Category select filtered by `type` (income vs expense categories)
- Uses `Select` component from `components/ui/` — **do not add `overflow-hidden` to its container** (dropdown gets clipped)

### Optimistic update pattern in this codebase

The established pattern (from Habits toggle, Reminders checkbox, Kanban DnD):
```typescript
onMutate: async (newTransaction) => {
  await queryClient.cancelQueries({ queryKey: ['transactions'] })
  const previous = queryClient.getQueryData(['transactions', ...filters])
  queryClient.setQueryData(['transactions', ...filters], (old) => [tempTx, ...old])
  return { previous }
},
onError: (err, vars, context) => {
  queryClient.setQueryData(['transactions', ...filters], context.previous)
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
}
```

**Important:** `useTransactions` query key includes the month filter. The optimistic update should target the correct month key using the transaction's `date` field.

### TransactionList query key pattern

Check `src/hooks/useTransactions.ts` — the query key includes `[selectedMonth, selectedType, selectedCategory]`. To target the right cache entry in `onMutate`, extract the month from the transaction date.

### Category lookup for temp transaction

To populate `category` on the optimistic entry:
```typescript
const categories = queryClient.getQueryData<Category[]>(['categories'])
const category = categories?.find(c => c.id === vars.category_id) ?? null
```
`['categories']` is always populated (staleTime: Infinity in `useCategories`).

### No DB migration required

The `transactions` table schema is already complete. This story is a pure frontend improvement.

### Project Structure

```
src/
├── components/finance/
│   └── TransactionForm.tsx     ← MODIFY (Task 1)
├── hooks/
│   └── useFinanceMutations.ts  ← MODIFY (Task 2)
│   └── useTransactions.ts      ← READ-ONLY reference
│   └── useMonthStats.ts        ← READ-ONLY verify (Task 3)
```

### References

- `src/components/finance/TransactionForm.tsx` — current form implementation
- `src/hooks/useFinanceMutations.ts` — `useCreateTransaction` at top of file
- `src/hooks/useTransactions.ts` — query key pattern for transactions
- `src/hooks/useCategories.ts` — staleTime: Infinity confirms category cache is always populated
- Story 3.x Dev Notes — optimistic update + rollback pattern reference

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none_

### Completion Notes List

- Task 1: Replaced single `error` string state with `errors: { amount?: string; category?: string }`. Validation now sets per-field errors and returns early if any are present. Each field error renders inline below its input. onChange handlers clear the specific field error. The old top-level error `<p>` block was removed.
- Task 2: Added `onMutate` to `useCreateTransaction` that cancels all `['transactions']` queries, snapshots all matching cache entries (filtering by month/type/category to avoid injecting into incompatible filters), prepends a temp transaction with `category` populated from the `['categories']` cache, and returns snapshots for rollback. `onError` restores all snapshots. `onSuccess` replaced by `onSettled` for invalidation (covers both success and error paths).
- Task 3: `useMonthStats` uses `useTransactions({ month })` and `useTransactions()` — both use `['transactions', filters]` query keys. The `onSettled` invalidation of `['transactions']` covers both, so no additional changes needed.

### File List

- `src/components/finance/TransactionForm.tsx`
- `src/hooks/useFinanceMutations.ts`

## Change Log

| Date       | Version | Author           | Description                                               |
| ---------- | ------- | ---------------- | --------------------------------------------------------- |
| 2026-03-22 | 1.0     | claude-sonnet-4-6 | Implemented inline field validation + optimistic update  |
