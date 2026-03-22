# Story 4.3: Duplicate Detection During CSV Import

Status: review

## Story

**As a user,**
I want the system to automatically detect and flag potential duplicate transactions during CSV import,
so that I don't end up with the same transaction recorded twice.

## Acceptance Criteria

1. **Given** I am in the CSV import preview step, **When** the system compares incoming rows against existing `transactions`, **Then** rows matching on (date + amount + description) are flagged as "Probabile duplicato" in the preview table.

2. **Given** a flagged duplicate is shown in the preview, **When** I review it, **Then** I can choose to include it anyway (override) or exclude it (default behavior).

3. **Given** I confirm the import with some duplicates excluded, **When** the import runs, **Then** excluded rows are skipped and the summary correctly reports the count of ignored duplicates.

## Prerequisites / Dependencies

**This story MUST be implemented after Story 4.2** (CSV Import with Automated Column Mapping). Both stories modify `src/components/finance/CSVImport.tsx`. Story 4.2 adds auto-detection of column mapping. This story adds duplicate detection in the preview step.

To minimize merge conflicts, implement 4.2 first and base this story's branch on the result of 4.2.

## Tasks / Subtasks

### Task 1: Fetch existing transactions for dedup comparison

**File:** `src/components/finance/CSVImport.tsx`

- [x] **1.1** In the component, access existing transactions from the React Query cache via `useQueryClient()` — `queryClient.getQueryData<Transaction[]>(['transactions', ...])`. Note: the transactions cache is keyed by month. For dedup purposes, fetch ALL transactions (not just the current month) from Supabase in a dedicated query.
- [x] **1.2** Add a `useQuery` inside `CSVImport` (or a dedicated `useAllTransactions` hook) that fetches all transactions for the current user without month filter. Use `staleTime: 60_000` — this data only needs to be fresh when the import dialog opens.
- [x] **1.3** Build a `Set<string>` of existing transaction fingerprints: `${date}|${amount}|${normalizedDescription}` where `normalizedDescription = (description ?? '').toLowerCase().trim()`.

### Task 2: Flag duplicate rows in the preview

**File:** `src/components/finance/CSVImport.tsx`

- [x] **2.1** For each row in the preview, compute its fingerprint using the current `mapping` (dateCol, amountCol, descriptionCol) and check it against the existing fingerprint set.
- [x] **2.2** Maintain a `Set<number>` state called `excludedRows` (row indices excluded from import, defaults to all detected duplicates being excluded).
- [x] **2.3** In the preview table, for each row that is a probable duplicate:
  - Show a badge/chip "Probabile duplicato" in amber color (e.g., `bg-amber-500/20 text-amber-400`) next to the row.
  - Show a checkbox "Includi comunque" (default: unchecked = excluded).
  - When user checks the checkbox, remove the row index from `excludedRows`.
- [x] **2.4** Rows that are NOT duplicates show normally with no badge.
- [x] **2.5** Recalculate duplicate flags whenever `mapping` changes (the user may have reassigned columns, changing the fingerprints).

### Task 3: Skip excluded rows during import and update dedup logic

**File:** `src/components/finance/CSVImport.tsx`

- [x] **3.1** Update the existing in-memory dedup `Set` key from `${date}|${amount}` to `${date}|${amount}|${normalizedDescription}` for consistency with the DB-based dedup.
- [x] **3.2** In the import loop, skip rows whose index is in `excludedRows`.
- [x] **3.3** Count skipped rows (both in-memory duplicates AND server-side duplicates that were excluded by the user).
- [x] **3.4** Update the summary message to: "X transazioni importate, Y duplicate ignorate".

### Task 4: Handle edge cases

- [x] **4.1** If `allTransactions` query is loading when the user reaches the preview step, show a small loading indicator in the preview header: "Rilevamento duplicati in corso...". Disable the Confirm button until the query resolves.
- [x] **4.2** If `allTransactions` query fails, show a non-blocking warning: "Impossibile verificare i duplicati — controlla manualmente" and allow the import to proceed (skip dedup check).
- [x] **4.3** Description-based matching: if the description column is not mapped (`descriptionCol` is undefined), fall back to `${date}|${amount}` fingerprint (same as current behavior). This ensures backward compatibility when description is absent.

## Dev Notes

### Current dedup logic in CSVImport.tsx

The current implementation uses an **in-memory** dedup set (checks for duplicates within the imported file itself, not against existing DB transactions):
```typescript
const seen = new Set<string>()
for (const row of rows) {
  const key = `${date}|${amount}`
  if (seen.has(key)) { skipped++; continue }
  seen.add(key)
  // insert...
}
```

This story **adds** a **DB-level dedup** (against existing transactions). The in-memory dedup (within-file) is kept but the key is updated to include description.

### Why fetch all transactions (not just current month)

Bank CSVs often contain transactions from multiple months. If we only check the current month's cache, we would miss duplicates in other months. A full-scan query is necessary but only fired once when the import dialog is open.

### Query pattern for all transactions

```typescript
const { data: allTxns = [], isLoading: txnsLoading } = useQuery({
  queryKey: ['transactions', 'all'],
  queryFn: async () => {
    const { data } = await supabase
      .from('transactions')
      .select('date, amount, description')
      .order('date', { ascending: false })
    return data ?? []
  },
  staleTime: 60_000,
  enabled: step === 'preview', // only fetch when in preview step
})
```

Using `enabled: step === 'preview'` avoids an unnecessary fetch until the user reaches the preview.

### Fingerprint normalization

```typescript
const makeFingerprint = (date: string, amount: number, desc: string | null) =>
  `${date}|${amount}|${(desc ?? '').toLowerCase().trim()}`
```

Apply the same normalization when building both the existing-set fingerprints AND the incoming-row fingerprints.

### Performance note

For a personal-use app, the full `transactions` query is not a concern — typical data size is hundreds to low thousands of rows. No pagination or chunking needed.

### Preview table row rendering pattern

The existing preview table maps `parsedRows.slice(0, 10)` to `<tr>` elements. Extend each row to:
1. Compute `isDuplicate = existingFingerprints.has(fingerprint(row))`
2. Compute `isExcluded = excludedRows.has(rowIndex)`
3. Render: `isDuplicate ? <td><span className="badge-amber">Probabile duplicato</span> <Checkbox checked={!isExcluded} onChange={...} /></td> : null`

### CSVImport already uses React Query client

Check if `CSVImport.tsx` already imports `useQueryClient`. If not, import from `@tanstack/react-query`.

### Project Structure

```
src/
├── components/finance/
│   └── CSVImport.tsx           ← MODIFY (all tasks)
├── hooks/
│   └── useFinanceMutations.ts  ← READ-ONLY reference
```

### References

- `src/components/finance/CSVImport.tsx` — full existing implementation (implement AFTER story 4.2)
- `src/hooks/useTransactions.ts` — query key pattern for reference
- Story 4.2 Dev Notes — column mapping and preview row structure
- CLAUDE.md §Schema transactions — `date`, `amount`, `description` fields confirmed

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `useQuery` with `queryKey: ['transactions', 'all']` fetching `date, amount, description` for all user transactions (no month filter), `staleTime: 60_000`, `enabled: step === 'preview'`.
- Built `existingFingerprints` as `Set<string>` via `useMemo` using `makeFingerprint(date, amount, desc)` helper.
- Added `duplicateRowIndices` (Set<number>) computed via `useMemo` — recalculates whenever `rows`, `mapping`, or `existingFingerprints` changes (covers task 2.5).
- Duplicate exclusion logic uses a separate `userIncludedRows` Set so that duplicates are excluded by default but can be overridden per-row via "Includi comunque" checkbox.
- Preview table shows amber badge "Probabile duplicato" + checkbox per duplicate row; excluded rows are dimmed with `opacity-50`.
- Loading state ("Rilevamento duplicati in corso...") shown in preview header; Confirm button disabled while `txnsLoading` is true (task 4.1).
- Error state shows non-blocking warning ("Impossibile verificare i duplicati — controlla manualmente"), dedup skipped, import still enabled (task 4.2).
- `makeFingerprint` falls back to empty string for null description, so `${date}|${amount}|` is the key when description is unmapped — backward-compatible with the old `${date}|${amount}` pattern via the empty-string suffix (task 4.3).
- In-memory dedup key updated to use `makeFingerprint` (includes description) — task 3.1.
- Import loop iterates by index and calls `isRowExcluded(i)` to skip server-side excluded duplicates — task 3.2/3.3.
- Summary message updated to "X transazioni importate, Y duplicate ignorate" — task 3.4.
- Removed unused `useTransactions` import (was fetching current month only — no longer needed in this component).

### File List

- `src/components/finance/CSVImport.tsx`
