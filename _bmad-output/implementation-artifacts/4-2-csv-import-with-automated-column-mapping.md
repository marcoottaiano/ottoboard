# Story 4.2: CSV Import with Automated Column Mapping

Status: review

## Story

**As a user,**
I want to import financial transactions via CSV with automated column detection and a preview before confirming,
so that I can bulk-load data from my bank export without manual entry.

## Acceptance Criteria

1. **Given** I drag-and-drop or select a CSV file in the import UI, **When** the file is parsed, **Then** the system auto-detects columns for date, amount, and description, and shows a preview table of the first 10 rows.

2. **Given** the auto-detected column mapping is incorrect, **When** I manually reassign columns via dropdown selectors, **Then** the preview table updates in real-time to reflect the new mapping.

3. **Given** I confirm the import, **When** the transactions are saved, **Then** only non-duplicate rows are inserted (see Story 4.3 for dedup logic), **And** a summary toast shows: "X transazioni importate, Y duplicate ignorate".

## Implementation Status Assessment

**CSVImport.tsx already exists** at `src/components/finance/CSVImport.tsx` (244 lines, ~9.9 KB). The component implements a multi-step flow (`upload → mapping → preview → done`) with:
- Drag-and-drop file upload ✅
- Manual column mapping via dropdown selectors ✅
- Preview table ✅ (but shows all rows, not just first 10)
- Deduplication by `date|amount` key ✅ (but NOT including description — see Story 4.3)
- Summary toast ✅

**What is missing for AC 1:**
- Auto-detection of columns: the current implementation shows empty dropdowns requiring manual selection. There is no heuristic that inspects CSV header names and pre-fills the mapping.

**What is missing/incorrect for AC 1:**
- Preview should show **first 10 rows** — currently it may show all rows.

**AC 2 is already implemented** — the dropdown selectors update the preview in real-time.

**AC 3 is partially implemented** — dedup exists but uses only `date|amount` (Story 4.3 will enhance to include description). The summary toast format should match "X transazioni importate, Y duplicate ignorate" — verify and align.

The scope of THIS story (4.2) is: add auto-detection logic to pre-fill column mapping from CSV headers, and cap the preview to 10 rows. Story 4.3 handles the dedup enhancement.

## Tasks / Subtasks

### Task 1: Implement column auto-detection heuristic

**File:** `src/components/finance/CSVImport.tsx`

- [x] **1.1** After CSV headers are parsed (first row), run a `detectColumnMapping(headers: string[])` function that returns a `ColumnMapping` object with pre-filled values.
- [x] **1.2** Implement the detection logic using case-insensitive substring matching on the header names:
  - **date column:** match headers containing `data`, `date`, `datum`, `fecha`, `giorno`, `day`
  - **amount column:** match headers containing `importo`, `amount`, `importe`, `betrag`, `valore`, `value`, `cifra`, `totale`, `total`
  - **description column:** match headers containing `descrizione`, `description`, `desc`, `causale`, `note`, `memo`, `oggetto`
  - **type column (optional):** match headers containing `tipo`, `type`, `segno`, `sign`
  - Return `undefined` for a field if no match found (user must map manually).
- [x] **1.3** Initialize the `mapping` state with the auto-detected values when transitioning to the `mapping` step.
- [x] **1.4** Show a visual indicator in the UI when a column was auto-detected vs manually selected (e.g., a small "rilevato automaticamente" label or green dot on auto-detected dropdowns). This makes the UX clear that the user should verify the detection.

### Task 2: Cap preview to first 10 rows

**File:** `src/components/finance/CSVImport.tsx`

- [x] **2.1** In the preview step, render only the first 10 parsed rows (use `.slice(0, 10)` before mapping to table rows).
- [x] **2.2** If the file has more than 10 rows, show a note below the table: "Mostrando 10 di X righe — tutte verranno importate".
- [x] **2.3** The actual import operation still processes ALL rows (not just the 10 shown).

### Task 3: Align summary toast copy

**File:** `src/components/finance/CSVImport.tsx`

- [x] **3.1** Locate the final summary/toast message after import completes.
- [x] **3.2** Ensure the format matches: "X transazioni importate, Y duplicate ignorate". Adjust wording if different.
- [x] **3.3** Use the existing toast/notification pattern in the codebase (check how other components show success messages — likely a `toast()` call or an inline message state).

## Dev Notes

### Existing CSVImport component structure

`src/components/finance/CSVImport.tsx` (~244 lines):
- Step state: `'upload' | 'mapping' | 'preview' | 'done'`
- `parsedRows`: array of `{ [col: string]: string }` objects (raw string values)
- `mapping` state: `{ dateCol, amountCol, descriptionCol, typeCol, categoryNameCol }`
- Custom CSV parser handles quoted fields (important — keep existing parser, do not replace with external library)
- Preview table shows mapped rows with inferred type (income/expense) and matched category
- Import: loops through all rows, calls `createTx.mutateAsync()` per row
- Dedup currently: `Set<string>` keyed by `${date}|${amount}` — Story 4.3 will change to `${date}|${amount}|${description}`

### Auto-detection implementation strategy

The `detectColumnMapping` function should be a pure utility — no side effects. Place it above the component or in a separate `src/lib/csv/detect-mapping.ts` file.

Example implementation sketch:
```typescript
function detectColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const lower = headers.map(h => h.toLowerCase().trim())
  const findCol = (patterns: string[]) =>
    headers[lower.findIndex(h => patterns.some(p => h.includes(p)))] ?? undefined

  return {
    dateCol:        findCol(['data', 'date', 'datum', 'fecha', 'giorno', 'day']),
    amountCol:      findCol(['importo', 'amount', 'importe', 'betrag', 'valore', 'value', 'cifra', 'totale', 'total']),
    descriptionCol: findCol(['descrizione', 'description', 'desc', 'causale', 'note', 'memo', 'oggetto']),
    typeCol:        findCol(['tipo', 'type', 'segno', 'sign']),
  }
}
```

### Where to call auto-detection

In the step transition handler from `upload` → `mapping` (the handler that fires after CSV is parsed and headers are available), call `detectColumnMapping(headers)` and `setMapping(prev => ({ ...prev, ...detected }))`.

### Visual indicator for auto-detected columns

Use a simple label strategy — track which fields were auto-detected in a `Set<string>` state (`autoDetectedFields`). In the dropdown label or below it, render a small chip: `<span className="text-xs text-emerald-400">rilevato</span>`. Clear this set when the user manually changes a dropdown.

### Existing column selectors

The mapping step renders `<select>` or the custom `Select` component for each field. Do not add `overflow-hidden` to the container of any `Select` — the dropdown will be clipped. This is a known gotcha in this codebase (documented in CLAUDE.md).

### No DB migration required

No schema changes. This is a pure frontend improvement to the existing import flow.

### Project Structure

```
src/
├── components/finance/
│   └── CSVImport.tsx           ← MODIFY (Tasks 1, 2, 3)
├── lib/csv/                    ← OPTIONAL: create detect-mapping.ts if preferred
```

### References

- `src/components/finance/CSVImport.tsx` — full existing implementation
- Story 4.3 — will modify the same file for duplicate detection; coordinate to avoid merge conflicts
- `src/components/ui/` — check Select component for dropdown behavior (overflow gotcha)
- CLAUDE.md §Gotcha Tecnici — Select dropDown and overflow-hidden warning

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- Task 1: Added pure `detectColumnMapping(headers: string[])` function above the component. Called in `handleFile` after parsing headers; detected fields are merged into mapping state and tracked in `autoDetectedFields` Set. Auto-detected fields show a small "rilevato" label in emerald-400; the label is removed when the user manually changes that dropdown.
- Task 2: Preview now uses `rows.slice(0, PREVIEW_LIMIT)` (constant = 10). An informational note "Mostrando 10 di X righe — tutte verranno importate" is shown when total rows exceed 10. The import loop still iterates over all `rows`.
- Task 3: Summary message unified to a single `<p>`: "X transazioni importate, Y duplicate ignorate". The previous two-line format (inserted on one line, skipped on another) was replaced with the required single-line format.
- Also fixed: `reset()` now restores `autoDetectedFields` to empty Set and resets `mapping` to defaults.
- Added `overflow-y-hidden` to the preview table container (alongside existing `overflow-x-auto`) per CLAUDE.md CSS gotcha.

### File List

- `src/components/finance/CSVImport.tsx`

## Change Log

| Date       | Author             | Description                                                                        |
| ---------- | ------------------ | ---------------------------------------------------------------------------------- |
| 2026-03-22 | claude-sonnet-4-6  | Implemented auto column detection, 10-row preview cap, aligned summary toast copy  |
