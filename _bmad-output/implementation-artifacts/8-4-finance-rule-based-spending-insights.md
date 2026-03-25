# Story 8.4: Finance Rule-Based Spending Insights

Status: ready-for-dev

## Story

As a user,
I want to see automatic insights about my spending patterns,
So that I can identify anomalies without manually analyzing my transactions.

## Acceptance Criteria

1. **Given** at least 3 months of transaction history **When** I open the Finance module **Then** an "Insights" card displays rule-based alerts including category spikes, budget overruns, and expensive day pattern.
2. **Given** a category whose spending this month is >20% above its 3-month rolling average AND difference > €5 **When** insights render **Then** alert: "La categoria [X] è aumentata del Y% rispetto alla media degli ultimi 3 mesi".
3. **Given** a budget for a category and current month spend exceeds it **When** insights render **Then** alert: "Hai superato il budget della categoria [X] di €Y".
4. **Given** at least 3 months of history **When** insights render **Then** alert: "Il tuo giorno più costoso è tipicamente il [giorno]" for the weekday with highest average spend.
5. **Given** < 1 month of transaction history **When** the insights card renders **Then** it shows "Aggiungi più transazioni per sbloccare gli insight" without crashing.
6. **Given** all computations **When** insights are generated **Then** all logic runs client-side only — no API call, no Edge Function, no server.
7. **Given** no insights triggered **When** all rules produce no alerts **Then** the card shows "Nessuna anomalia rilevata" (positive state).

## Tasks / Subtasks

- [ ] Task 1 — Create spending insights utility (AC: 2, 3, 4, 5, 6)
  - [ ] Create `src/lib/finance/spendingInsights.ts`
  - [ ] Export `computeSpendingInsights(transactions: TransactionWithCategory[], budgets: Budget[], today: Date): SpendingInsight[]`
  - [ ] Implement rule 1: category spike vs 3-month rolling average (threshold: >20% AND >€5)
  - [ ] Implement rule 2: budget overrun (current month spend > budget amount)
  - [ ] Implement rule 3: most expensive weekday over last 3 months
  - [ ] Return `[]` if < 1 month of data available

- [ ] Task 2 — Create `SpendingInsightsCard` component (AC: 1–7)
  - [ ] Create `src/components/finance/SpendingInsightsCard.tsx`
  - [ ] Calls `useTransactions({})` and `useBudgets()` — no month filter (needs full history)
  - [ ] Calls `computeSpendingInsights(transactions, budgets, new Date())`
  - [ ] Shows: loading skeleton, empty state (< 1 month), insights list, or "Nessuna anomalia"
  - [ ] Each insight has: icon (AlertTriangle/TrendingUp/Calendar from lucide-react) + message text
  - [ ] Glassmorphism styling consistent with other finance cards

- [ ] Task 3 — Add `SpendingInsightsCard` to finance page (AC: 1)
  - [ ] In `src/app/finance/page.tsx`: import and render `<SpendingInsightsCard />` after the pie/bar charts grid, before `<GoalsSection />`
  - [ ] No new route, no new page

- [ ] Task 4 — Build verification (AC: 1–7)
  - [ ] `npm run build` — zero errors
  - [ ] Test with empty transactions (shows empty state, no crash)
  - [ ] Test with <1 month data (shows "Aggiungi più transazioni")

## Dev Notes

### spendingInsights.ts — Full Implementation Guide

```typescript
// src/lib/finance/spendingInsights.ts
import { TransactionWithCategory } from '@/types'

export interface SpendingInsight {
  type: 'spike' | 'budget-overrun' | 'expensive-day'
  message: string
  severity: 'warning' | 'info'
}

const WEEKDAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

// Parse YYYY-MM-DD as local date (avoids UTC shift bug)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Group expense transactions by YYYY-MM key
function groupByMonth(transactions: TransactionWithCategory[]): Map<string, TransactionWithCategory[]> {
  const map = new Map<string, TransactionWithCategory[]>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const [y, m] = t.date.split('-')
    const key = `${y}-${m}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return map
}

export function computeSpendingInsights(
  transactions: TransactionWithCategory[],
  today: Date
): SpendingInsight[] {
  const insights: SpendingInsight[] = []
  const expenses = transactions.filter(t => t.type === 'expense')
  if (expenses.length === 0) return []

  // Determine data span
  const dates = expenses.map(t => parseLocalDate(t.date))
  const oldest = new Date(Math.min(...dates.map(d => d.getTime())))
  const monthsOfData = (today.getFullYear() - oldest.getFullYear()) * 12 + (today.getMonth() - oldest.getMonth())
  if (monthsOfData < 1) return []

  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const byMonth = groupByMonth(expenses)

  // Rule 2: Budget overrun (works with 1+ month)
  // NOTE: budgets are passed by the component — import Budget type from '@/types'

  // Rule 1: Category spike (needs 3+ months)
  if (monthsOfData >= 3) {
    // Get last 3 months (excluding current)
    const prev3: string[] = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      prev3.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // Aggregate by category for current month and 3-month avg
    const currentByCategory = new Map<string, { name: string; total: number }>()
    for (const t of byMonth.get(currentMonthKey) ?? []) {
      const catName = t.category?.name ?? 'Sconosciuta'
      const existing = currentByCategory.get(t.category_id) ?? { name: catName, total: 0 }
      currentByCategory.set(t.category_id, { name: catName, total: existing.total + t.amount })
    }

    const avgByCategory = new Map<string, number>()
    for (const monthKey of prev3) {
      for (const t of byMonth.get(monthKey) ?? []) {
        avgByCategory.set(t.category_id, (avgByCategory.get(t.category_id) ?? 0) + t.amount)
      }
    }
    for (const [catId, total] of avgByCategory) {
      avgByCategory.set(catId, total / 3)
    }

    for (const [catId, { name, total }] of currentByCategory) {
      const avg = avgByCategory.get(catId) ?? 0
      if (avg > 0) {
        const pctIncrease = ((total - avg) / avg) * 100
        const absIncrease = total - avg
        if (pctIncrease > 20 && absIncrease > 5) {
          insights.push({
            type: 'spike',
            message: `La categoria ${name} è aumentata del ${Math.round(pctIncrease)}% rispetto alla media degli ultimi 3 mesi`,
            severity: 'warning',
          })
        }
      }
    }

    // Rule 3: Most expensive weekday
    const weekdayTotals: number[] = new Array(7).fill(0)
    const weekdayCounts: number[] = new Array(7).fill(0)
    for (const monthKey of prev3) {
      for (const t of byMonth.get(monthKey) ?? []) {
        const dow = parseLocalDate(t.date).getDay()
        weekdayTotals[dow] += t.amount
        weekdayCounts[dow]++
      }
    }
    const weekdayAvgs = weekdayTotals.map((total, i) => weekdayCounts[i] > 0 ? total / weekdayCounts[i] : 0)
    const maxDow = weekdayAvgs.indexOf(Math.max(...weekdayAvgs))
    if (weekdayAvgs[maxDow] > 0) {
      insights.push({
        type: 'expensive-day',
        message: `Il tuo giorno più costoso è tipicamente il ${WEEKDAY_NAMES[maxDow]}`,
        severity: 'info',
      })
    }
  }

  return insights
}
```

### Budget Overrun Rule
The component needs to call `useBudgets()` and pass budget data to the insights function, or implement the rule directly in the component:
```typescript
// In SpendingInsightsCard:
const { data: budgets = [] } = useBudgets()
// For current month budgets:
const currentMonthBudgets = budgets.filter(b => b.month.startsWith(currentMonthKey))
// Check each budget vs actual spend for that category this month
```
Keep budget overrun rule simple: if category spend > budget amount, show alert.

### SpendingInsightsCard Component Structure
```typescript
'use client'
import { AlertTriangle, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react'
// ...

export function SpendingInsightsCard() {
  const { data: transactions = [], isLoading: txLoading } = useTransactions({})
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets()

  if (txLoading || budgetsLoading) return <SkeletonCard />

  const insights = computeSpendingInsights(transactions, new Date())
  // + budget overrun check inline

  if (/* < 1 month data */) {
    return <EmptyStateCard message="Aggiungi più transazioni per sbloccare gli insight" />
  }

  // Render insights list or "Nessuna anomalia rilevata"
}
```

### Adding to Finance Page
```typescript
// src/app/finance/page.tsx — add after the grid, before GoalsSection
import { SpendingInsightsCard } from '@/components/finance/SpendingInsightsCard'

// In JSX after the grid:
<SpendingInsightsCard />
<GoalsSection />
```

### Critical: Date Parsing
Always use `parseLocalDate('YYYY-MM-DD')` → `new Date(y, m-1, d)` pattern. Never `new Date('2026-03-15')` which parses as UTC midnight, causing timezone shift in CET (+1h → previous day).

### Do NOT Recreate
- `RuleCard5030.tsx` — already exists, covers 50/30/20 rule, leave untouched
- `useBudgets.ts` — already exists, import as-is

### Project Structure Notes
- New file: `src/lib/finance/spendingInsights.ts`
- New file: `src/components/finance/SpendingInsightsCard.tsx`
- Modified: `src/app/finance/page.tsx` — add import + `<SpendingInsightsCard />`
- Finance module color: `emerald`

### References
- `useTransactions` hook: `src/hooks/useTransactions.ts`
- `useBudgets` hook: `src/hooks/useBudgets.ts`
- Date parsing pattern: CLAUDE.md "Gotcha Tecnici — Date & Timezone"
- Existing insight-like component for style reference: `src/components/finance/RuleCard5030.tsx`
- Architecture: all client-side computation for spending insights

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
