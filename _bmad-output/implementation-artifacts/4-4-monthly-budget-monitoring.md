# Story 4.4: Monthly Budget Monitoring

Status: ready-for-dev

## Story

**As a user,**
I want to define monthly spending budgets per expense category and see my progress against them,
so that I can control overspending before the month ends.

## Acceptance Criteria

1. **Given** I open the budget section in /finance, **When** I set a budget amount for a category and month, **Then** the budget is saved to `budgets` and a horizontal progress bar shows "speso / budget" for that category.

2. **Given** spending in a category reaches 80% of the budget, **When** the BudgetTracker renders, **Then** the progress bar changes to amber color as a visual warning.

3. **Given** spending in a category exceeds 100% of the budget, **Then** the progress bar turns red and shows the overspent amount.

4. **Given** no budget is set for a category, **When** I view that category's spending, **Then** the category is displayed without a progress bar (no budget = no constraint shown).

## Implementation Status Assessment

**`BudgetTracker.tsx` already exists** (`src/components/finance/BudgetTracker.tsx`, ~11 KB). It implements per-category budget tracking with `budgets` table and shows spending progress.

**AC 1 is implemented** — budget creation and progress bars exist.

**AC 2 & 3 (color thresholds) may be partially implemented.** Read `BudgetTracker.tsx` to check:
- Does it already use amber at 80% and red at 100%? The BudgetTracker may use a fixed color or a simple green/red.
- If color thresholds are present, verify the exact breakpoints match the AC (80% = amber, >100% = red).
- If missing: add the threshold logic.

**AC 4 is implemented** — categories without budgets are displayed without progress bars (the component filters budget entries by those that exist in the `budgets` table).

**The scope of this story** is: verify the color threshold logic in `BudgetTracker.tsx` and implement it if missing or incorrect. Also verify the "overspent amount" display on >100%.

## Tasks / Subtasks

### Task 1: Read and assess BudgetTracker color threshold logic

**File:** `src/components/finance/BudgetTracker.tsx`

- [ ] **1.1** Read the full component. Locate where progress bar color is determined (likely a conditional className on the progress bar div).
- [ ] **1.2** Document current thresholds (if any).

### Task 2: Implement/fix color thresholds (if not present or incorrect)

**File:** `src/components/finance/BudgetTracker.tsx`

- [ ] **2.1** Compute `pct = (spent / budget) * 100`.
- [ ] **2.2** Derive progress bar color:
  - `pct < 80` → `bg-emerald-500` (green — under control)
  - `pct >= 80 && pct < 100` → `bg-amber-500` (amber — warning)
  - `pct >= 100` → `bg-red-500` (red — over budget)
- [ ] **2.3** When `pct >= 100`, show the overspent amount below the progress bar:
  - Text: `"Sforato di €{(spent - budget).toFixed(2)}"` in `text-red-400 text-xs`.
  - Ensure the progress bar does not exceed 100% width visually (cap `width` at `100%`).
- [ ] **2.4** At 80% threshold (amber), show a warning label:
  - Text: `"Attenzione: {pct.toFixed(0)}% del budget"` or similar in `text-amber-400 text-xs`.
  - This is optional if the color change alone is sufficient — use judgement to keep UI clean.

### Task 3: Verify budget edit/create UX

**File:** `src/components/finance/BudgetTracker.tsx`

- [ ] **3.1** Confirm that the budget amount input for a category is editable inline or via a modal.
- [ ] **3.2** Confirm that `useBudgets` and `useFinanceMutations` (create/update budget) work correctly for the selected month.
- [ ] **3.3** No changes needed if the CRUD flow already works.

## Dev Notes

### BudgetTracker component structure

`BudgetTracker.tsx` (~11 KB) is a large component. Key structure:
- Uses `useBudgets(selectedMonth)` from `src/hooks/useBudgets.ts`
- Uses `useTransactions` filtered by month and type='expense'
- Uses `useCategories` to list expense categories
- Groups spending by `category_id`, computes `spent` per category
- For each category with a budget entry: renders progress bar

### Progress bar color logic pattern

The pattern in this codebase uses conditional Tailwind classes with template strings or `cn()` utility. Example:
```tsx
const barColor =
  pct >= 100 ? 'bg-red-500' :
  pct >= 80  ? 'bg-amber-500' :
               'bg-emerald-500'

<div
  className={`h-2 rounded-full transition-all ${barColor}`}
  style={{ width: `${Math.min(pct, 100)}%` }}
/>
```

**Important:** Use `Math.min(pct, 100)` for the `width` style to cap at 100% — the bar should never overflow its container even when spending exceeds budget.

### Budget amount display

The "speso / budget" label should show formatted currency (e.g., "€45.00 / €100.00"). Use `.toFixed(2)` for consistent decimal display.

### Month alignment

`BudgetTracker` receives `selectedMonth` from the parent `FinancePage`. Budgets in the `budgets` table are keyed by `month` (first day of month as a DATE). Ensure `useBudgets(selectedMonth)` correctly filters by the selected month.

### No DB migration required

The `budgets` table already exists with fields: `id`, `category_id`, `amount`, `month`. No schema changes needed.

### Project Structure

```
src/
├── components/finance/
│   └── BudgetTracker.tsx       ← MODIFY (Task 2) — read first (Task 1)
├── hooks/
│   └── useBudgets.ts           ← READ-ONLY verify
│   └── useFinanceMutations.ts  ← READ-ONLY verify (budget CRUD)
```

### References

- `src/components/finance/BudgetTracker.tsx` — full existing implementation
- `src/hooks/useBudgets.ts` — budget query by month
- `src/hooks/useTransactions.ts` — spending data source
- CLAUDE.md §Schema budgets — `category_id`, `amount`, `month` fields confirmed

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
