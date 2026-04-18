---
title: "Finance Month CSV Export"
slug: "finance-month-csv-export"
created: "2026-04-18"
status: "ready-for-dev"
stepsCompleted: [1, 2, 3, 4]
tech_stack: ["Next.js 14 App Router", "TypeScript 5 strict", "React Query (TanStack) v5", "Tailwind CSS 3", "Lucide React"]
files_to_modify:
  - src/lib/finance/exportCsv.ts (new)
  - src/components/finance/MonthlyHeader.tsx
code_patterns:
  - "Pure utility in src/lib/finance/ — no React, no hooks, pure function"
  - "Immutable: input array never mutated, new CSV string returned"
  - "TransactionWithCategory type from @/types"
  - "Month label via toLocaleDateString it-IT already present in MonthlyHeader"
  - "Browser download via URL.createObjectURL + anchor click, no lib required"
test_patterns: ["No test framework configured in project"]
---

# Finance Month CSV Export

## Overview

### Problem Statement

The `/finance` page has no way to export transaction data. Users cannot analyse their monthly spending outside the app (e.g., in Excel or Google Sheets).

### Solution

Add a download button in `MonthlyHeader` that exports **all** transactions of the currently selected month (both income and expense) as a semicolon-delimited CSV file, regardless of any active filters in `TransactionList`.

### Scope

- **In scope**: New pure utility functions `buildCsvString` and `downloadCsv` in `src/lib/finance/exportCsv.ts`, export button in `MonthlyHeader`, client-side CSV generation and download trigger.
- **Out of scope**: Server-side generation, multi-month export, applying `TransactionList` filters to export, additional export formats.

---

## Context for Development

### Codebase Patterns

| Pattern           | Detail                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utility functions | Live in `src/lib/<domain>/`. Pure functions, no React. Exception: `exportCsv.ts` contains `downloadCsv` which is a browser-side-effect function — must only be imported from client components. |
| Immutability      | Input arrays are never mutated; new values returned.                                                                                                                                            |
| Type source       | `TransactionWithCategory` from `@/types` — has `date`, `amount`, `type`, `category` (name), `description`.                                                                                      |
| Data fetch        | `useTransactions({ month })` returns `TransactionWithCategory[]`, already filtered by month (format `YYYY-MM`).                                                                                 |
| Component style   | Tailwind CSS, dark background `bg-white/5 border border-white/10`, small buttons use `hover:bg-white/10 transition-colors`.                                                                     |
| Icons             | Lucide React — `Download` icon available.                                                                                                                                                       |
| Month label       | `monthLabel(month)` already defined in `MonthlyHeader.tsx` — returns e.g. `"aprile 2026"`.                                                                                                      |
| CSV filename      | `ottoboard-finance-MM-YYYY.csv` (e.g. `ottoboard-finance-04-2026.csv`).                                                                                                                         |
| CSV separator     | `;` (semicolon — Italian/Excel standard).                                                                                                                                                       |
| CSV encoding      | UTF-8 with BOM (`\uFEFF`) so Excel opens it correctly without encoding issues.                                                                                                                  |
| Browser download  | `URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))` + programmatic `<a>` click — no external library.                                                                   |

### Files to Reference

| File                                       | Role                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| `src/components/finance/MonthlyHeader.tsx` | Target component — add export button                     |
| `src/hooks/useTransactions.ts`             | Fetch hook to reuse in `MonthlyHeader`                   |
| `src/types/index.ts`                       | `TransactionWithCategory`, `Category` types              |
| `src/lib/finance/spendingInsights.ts`      | Reference for pure utility pattern in `src/lib/finance/` |

### Technical Decisions

- **Client-side only**: CSV is generated in the browser from already-fetched React Query data — no API route needed.
- **Independent fetch in MonthlyHeader**: `MonthlyHeader` already calls `useMonthStats(selectedMonth)` which internally calls `useTransactions({ month })`. React Query deduplicates the request, so calling `useTransactions({ month: selectedMonth })` again in `MonthlyHeader` is zero-cost (cache hit).
- **No filter influence**: Export always uses `useTransactions({ month: selectedMonth })` with no type/category/search filters, regardless of what `TransactionList` shows.
- **BOM prefix**: `\uFEFF` prepended to the CSV string to ensure Excel on Windows opens the file with correct UTF-8 encoding (important for category names with accented characters).

---

## Implementation Plan

- [ ] **Task 1: Create `src/lib/finance/exportCsv.ts`**
  - File: `src/lib/finance/exportCsv.ts` _(new file)_
  - Action: Create a module with two exported functions. Add a comment at the top of the file: `// NOTE: this file uses browser-only APIs (Blob, URL, document) — only import from client components.`
    1. `buildCsvString(transactions: TransactionWithCategory[]): string` — converts the array to a semicolon-delimited CSV string with BOM prefix.
    2. `downloadCsv(csvString: string, filename: string): void` — creates a Blob, fires a programmatic download, then revokes the object URL.
  - Notes for `buildCsvString`:
    - Sort rows by `date` ascending, tiebreaker by `created_at` ascending (preserves original insertion order for same-day transactions).
    - CSV header row: `Data;Importo;Tipo;Categoria;Descrizione`
    - Column values per row (in order):
      - `date`: ISO string as-is (e.g. `2026-04-15`) — treated as plain text, no locale reformatting.
      - `amount`: number formatted with `.toFixed(2)` and `.` replaced with `,` (Italian locale). **Expenses are negated**: if `type === 'expense'`, prepend `-` (e.g. `-12,50`); income stays positive (e.g. `12,50`).
      - `type` mapped to label: `income` → `Entrata`, `expense` → `Uscita`.
      - `category?.name ?? ''`
      - `description ?? ''`
    - Wrap each cell value in double quotes and escape internal double quotes by doubling them (`"` → `""`) to handle semicolons/quotes in descriptions.
    - Prepend UTF-8 BOM: `'\uFEFF'`.
  - Notes for `downloadCsv`:
    - Create `const url = URL.createObjectURL(new Blob([csvString], { type: 'text/csv;charset=utf-8;' }))`.
    - Create `const a = document.createElement('a')`, set `a.href = url`, `a.download = filename`, `a.style.display = 'none'`.
    - **Append to DOM**: `document.body.appendChild(a)` — required by Firefox.
    - Call `a.click()`.
    - **Remove from DOM**: `document.body.removeChild(a)`.
    - Revoke the URL after a tick to ensure download starts: `setTimeout(() => URL.revokeObjectURL(url), 0)`.

- [ ] **Task 2: Add export button and logic to `MonthlyHeader.tsx`**
  - File: `src/components/finance/MonthlyHeader.tsx`
  - Action:
    1. Import `Download` from `lucide-react`.
    2. Import `useTransactions` from `@/hooks/useTransactions`.
    3. Import `buildCsvString` and `downloadCsv` from `@/lib/finance/exportCsv`.
    4. Inside the component, call `const { data: transactions } = useTransactions({ month: selectedMonth })` (React Query will cache-hit, no extra network request).
    5. Add a `handleExport` function:
       ```ts
       function handleExport() {
         if (!transactions?.length) return;
         const csv = buildCsvString(transactions);
         const [yyyy, mm] = selectedMonth.split("-");
         downloadCsv(csv, `ottoboard-finance-${mm}-${yyyy}.csv`);
       }
       ```
    6. Add the export button in the month selector row, to the right of the forward chevron button:
       ```tsx
       <button onClick={handleExport} disabled={!transactions?.length} title="Esporta CSV" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white disabled:opacity-30">
         <Download size={16} />
       </button>
       ```
  - Notes: The button is disabled when `transactions` is empty or undefined (no data to export). No loading spinner needed — export is instantaneous once data is in cache.

---

## Acceptance Criteria

- [ ] **AC 1**: Given April 2026 is selected with at least one transaction, when the user clicks the Download icon in `MonthlyHeader`, then a CSV file named exactly `ottoboard-finance-04-2026.csv` is downloaded to the user's device.
- [ ] **AC 2**: Given the downloaded CSV, when opened in Excel (Windows), then all columns display correctly (no encoding artifacts on accented characters), columns are separated by `;`, and the header row is `Data;Importo;Tipo;Categoria;Descrizione`.
- [ ] **AC 3**: Given the downloaded CSV, when reviewing the rows, then all transactions of the selected month are present (both income and expense), sorted ascending by date.
- [ ] **AC 4**: Given `TransactionList` has an active type filter (e.g. only "Uscite"), when the user clicks export, then the CSV still contains **all** transactions for the month (not just the filtered ones).
- [ ] **AC 5**: Given the selected month has no transactions, when viewing `MonthlyHeader`, then the Download button is visually disabled (opacity-30) and clicking it has no effect.
- [ ] **AC 6**: Given a transaction has a description containing a semicolon or double-quote, when exported, then the CSV cell is properly quoted and double-quotes are escaped so the file remains parseable.
- [ ] **AC 7**: Given the `Importo` column, when opened in Excel with Italian locale settings, then expense amounts display as negative values with comma separator (e.g. `-12,50`) and income amounts display as positive (e.g. `12,50`).
- [ ] **AC 8**: Given a CSV opened in Firefox before being opened in Chrome, when the Download button is clicked, then the file downloads correctly (anchor is appended/removed from DOM to ensure cross-browser compatibility).

---

## Dependencies

- No new npm packages required — browser `Blob`, `URL.createObjectURL`, and DOM manipulation are sufficient.
- `useTransactions` hook already exists and supports `{ month }` filter.
- `TransactionWithCategory` type already exists in `@/types`.

## Testing Strategy

- **Manual testing**:
  1. Navigate to `/finance`, select a month with transactions.
  2. Click the Download button — verify file downloads with correct filename.
  3. Open in Excel — verify columns, separator, encoding, date sort order.
  4. Apply a type filter in `TransactionList`, then export — verify CSV contains all types.
  5. Navigate to a month with no transactions — verify button is disabled.
  6. Add a transaction with description containing `;` and `"` — verify CSV is still valid.

## Notes

- **Risk**: `URL.revokeObjectURL` must be called after the click to prevent memory leaks — use `setTimeout(() => URL.revokeObjectURL(url), 0)` (specified in Task 1). Firefox also requires the anchor to be appended to `document.body` before `.click()` — already specified in Task 1.
- **Date format**: The `Data` column uses ISO `YYYY-MM-DD` (plain text). Excel may not auto-parse it as a date on all locale settings — this is intentional and acceptable for this scope.
- **Future**: Could be extended to multi-month range export or to honour `TransactionList` filters — both out of scope for now.
