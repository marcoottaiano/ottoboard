# Story 4.7: Client-Side Spending Insights

Status: review

## Story

**As a user,**
I want to see local insights on my spending trends (category breakdown, monthly comparison, budget alerts),
so that I can understand my financial patterns without any server-side processing cost.

## Acceptance Criteria

1. **Given** I have transactions for at least 2 months, **When** I view the finance page, **Then** a bar+line chart shows monthly income and expenses for the last 6 months, computed client-side.

2. **Given** I view the spending pie chart, **When** transactions for the current month exist, **Then** the chart shows percentage breakdown by expense category, calculated in the browser.

3. **Given** a category's spending exceeds its budget in the current month, **When** I view the finance dashboard, **Then** an alert indicator appears on that category's budget bar.

## Implementation Status Assessment

**AC 1 is already implemented.** `MonthlyBarChart.tsx` (~3.3 KB) renders a bar+line chart for monthly income/expense trends. It computes aggregations client-side from `useTransactions` data. Verify that:
- It covers the last 6 months (not just the selected month)
- The data is truly client-side (no server-side aggregation endpoint)

**AC 2 is already implemented.** `SpendingPieChart.tsx` (~3.9 KB) renders a donut chart with category breakdown for the current/selected month. It computes percentage breakdown client-side from `useTransactions` filtered by the selected month. Verify the chart is client-side only.

**AC 3 is partially implemented.** `BudgetTracker.tsx` already shows spending vs budget with progress bars (Story 4.4 adds the color thresholds). The alert indicator specifically mentioned in AC 3 may be the same color threshold (red = over budget). Verify whether Story 4.4 already covers this AC or if a separate alert indicator (badge/icon) is expected.

**The scope of this story** is predominantly a **verification and gap-fill** task:
- Confirm charts are client-side computed ✅ (not an API call)
- Confirm MonthlyBarChart covers 6 months
- Add alert indicator on budget bars if not already in Story 4.4
- Ensure the insights are visible without page reload (React Query derived state)

## Tasks / Subtasks

### Task 1: Verify MonthlyBarChart covers last 6 months

**File:** `src/components/finance/MonthlyBarChart.tsx`

- [x] **1.1** Read the component. Check what time window it uses (selected month only vs. last N months).
- [x] **1.2** If it only shows the selected month's data or fewer than 6 months:
  - Fetch transactions for the last 6 months in the component or pass data from the parent.
  - Group by month client-side: `transactions.reduce((acc, tx) => { ... }, {})`.
  - Render bars for the last 6 months in chronological order.
- [x] **1.3** If it already covers 6 months, no changes needed. — Already implemented correctly: uses `useTransactions({})` (no month filter), computes last 6 months via `last6Months()` helper, filters and aggregates client-side.

### Task 2: Verify SpendingPieChart is fully client-side

**File:** `src/components/finance/SpendingPieChart.tsx`

- [x] **2.1** Read the component. Confirm it derives data from `useTransactions` (client-side) and not from a server aggregation endpoint. — Already implemented correctly: derives all data from `useTransactions({ month, type: 'expense' })`.
- [x] **2.2** Confirm it shows percentage breakdown (not just amounts). If it shows amounts only, add percentage labels to the tooltip or legend: `"{pct.toFixed(1)}%"`. — **Fixed**: the legend only showed amounts; added `{pct.toFixed(1)}%` label next to each category in the legend list.
- [x] **2.3** If already correct, no changes needed.

### Task 3: Add budget alert indicator (AC 3)

**File:** `src/components/finance/BudgetTracker.tsx`

- [x] **3.1** Check if Story 4.4 already adds a red indicator when spending > budget. If yes, AC 3 is covered by the color threshold and this task is a no-op. — Already implemented correctly: Story 4.4 added `barColor` logic (emerald/amber/red) and a `<p className="text-red-400">Sforato di €X.XX</p>` text indicator below the bar when `pct >= 100`. AC 3 is covered.
- [x] **3.2** If no visual indicator exists beyond the progress bar color, add a small alert icon or badge on the category row when `pct >= 100`. — No-op: indicator already present via red bar color + "Sforato di €X" text.

### Task 4: Ensure insights are reactive without reload

- [x] **4.1** Verify that both `MonthlyBarChart` and `SpendingPieChart` re-render when transactions are added/deleted/modified. — Already implemented correctly: both components call `useTransactions` directly; React Query cache invalidation triggers automatic re-renders.
- [x] **4.2** If any chart component memoizes its data with `useMemo`, ensure the dependency array includes the transactions array. — No `useMemo` used; all derivations are inline in the render function, so they recompute on every render naturally.
- [x] **4.3** No changes needed if the components already use reactive hooks. — Confirmed: no changes needed.

## Dev Notes

### Client-side computation principle

The key requirement is "no server-side processing cost" — all aggregations (sum by category, sum by month, percentage calculation) must be JavaScript computations on data already fetched by React Query. This is already the pattern in this codebase (Supabase client queries → React Query cache → component derives aggregated view).

### MonthlyBarChart data shape

The chart likely expects an array of `{ month: string, income: number, expenses: number }`. To generate this for the last 6 months:
```typescript
const last6Months = Array.from({ length: 6 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - (5 - i))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
```
Then group transactions by `tx.date.slice(0, 7)` (YYYY-MM prefix) and sum income/expenses per month.

### SpendingPieChart tooltip

Recharts PieChart tooltip can show percentage by using `payload[0].percent` from the Recharts onTooltipChange callback, or computing it as `(value / total) * 100` where `total = sum of all expense amounts`.

### Multi-month data fetching consideration

If `MonthlyBarChart` needs transactions from the last 6 months but `useTransactions` is filtered by `selectedMonth`, the component needs either:
- A dedicated `useTransactionsRange(startMonth, endMonth)` hook that fetches a date range.
- Or pass `null` for month to fetch all transactions and filter client-side.

Check if the existing `useTransactions` hook supports an unfiltered (all months) mode. If not, add a variant.

### BudgetTracker and Story 4.4 coordination

Story 4.4 adds the color thresholds (amber/red) to `BudgetTracker`. This story's Task 3 only adds an additional icon indicator if the color alone is deemed insufficient. Read Story 4.4's implementation before working on Task 3 to avoid duplication.

### No DB migration required

This story is pure frontend — no schema changes.

### Project Structure

```
src/
├── components/finance/
│   ├── MonthlyBarChart.tsx         ← VERIFY + MODIFY if needed (Task 1)
│   ├── SpendingPieChart.tsx        ← VERIFY + MODIFY if needed (Task 2)
│   └── BudgetTracker.tsx           ← VERIFY + MODIFY if needed (Task 3)
├── hooks/
│   └── useTransactions.ts          ← VERIFY + MODIFY if needed (multi-month fetch)
```

### References

- `src/components/finance/MonthlyBarChart.tsx` — bar+line chart implementation
- `src/components/finance/SpendingPieChart.tsx` — donut chart implementation
- `src/components/finance/BudgetTracker.tsx` — budget progress bars (see also Story 4.4)
- `src/hooks/useTransactions.ts` — check for range query support
- Story 4.4 Dev Notes — BudgetTracker color threshold implementation
- Recharts 2.x docs — PieChart, BarChart, ComposedChart APIs

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **Task 1 (MonthlyBarChart)**: Already fully implemented. Fetches all transactions with `useTransactions({})` (no month filter), computes last 6 months via `last6Months()` helper, aggregates income/expenses client-side, renders a bar+line ComposedChart. No changes needed.
- **Task 2 (SpendingPieChart)**: Component was already client-side (using `useTransactions`), but only showed amounts in the legend — percentage was missing. Fixed by computing `pct = (d.total / totalExpense) * 100` for each category and rendering `{pct.toFixed(1)}%` next to the amount in the legend list.
- **Task 3 (BudgetTracker)**: Already fully covered by Story 4.4 implementation. Red progress bar color + "Sforato di €X.XX" text message are both shown when `pct >= 100`. No additional alert icon needed.
- **Task 4 (Reactivity)**: Both components directly call `useTransactions` with no intermediate memoization. React Query cache invalidation automatically triggers re-renders. No changes needed.

### File List

- `src/components/finance/SpendingPieChart.tsx` — added percentage labels to legend
