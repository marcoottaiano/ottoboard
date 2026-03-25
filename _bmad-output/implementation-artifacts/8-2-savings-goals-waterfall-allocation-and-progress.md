# Story 8.2: Savings Goals — Waterfall Allocation & Progress

Status: ready-for-dev

## Story

As a user,
I want to see how my total balance is automatically distributed across my savings goals in priority order,
So that I know which goals are funded and how far along each one is.

## Acceptance Criteria

1. **Given** a total balance and an ordered list of goals **When** the Goals section renders **Then** the balance is allocated sequentially: goal 1 fills first, surplus flows to goal 2, etc.
2. **Given** allocated amounts **When** each GoalCard renders **Then** it shows allocated amount / target amount in the progress bar.
3. **Given** allocation states **When** a goal is fully funded **Then** it shows "Raggiunto" badge; partially funded shows "In corso"; zero funded shows "Non avviato".
4. **Given** a new transaction is added **When** the Goals section re-renders **Then** allocations recalculate automatically (React Query derived state — no extra Supabase call).
5. **Given** the example: balance=€600, goal1 target=€500, goal2 target=€800 **When** rendered **Then** goal1 shows €500/€500 (Raggiunto), goal2 shows €100/€800 (In corso).
6. **Given** total balance ≤ 0 **When** Goals section renders **Then** all goals show "Non avviato" (€0/€target) without crashing.
7. **Given** `completed` goals **When** waterfall runs **Then** completed goals are excluded from allocation computation (they are already done).

## Tasks / Subtasks

- [ ] Task 1 — Create waterfall utility function (AC: 1, 5, 6, 7)
  - [ ] Create `src/lib/finance/waterfall.ts` (or inline in GoalsSection if simple)
  - [ ] Function signature: `computeWaterfall(goals: FinancialGoal[], totalBalance: number): Map<string, number>`
  - [ ] Returns Map of `goal.id → allocatedAmount`
  - [ ] Skip `completed` goals, allocate to active goals in order
  - [ ] Clamp allocation: `min(remainingBalance, goal.target_amount)`

- [ ] Task 2 — Update `GoalCard` to accept `allocatedAmount` prop (AC: 2, 3)
  - [ ] Add optional prop `allocatedAmount?: number` to GoalCard interface
  - [ ] When `allocatedAmount` is provided: use it for progress bar and display
  - [ ] Keep `current_amount` as fallback when `allocatedAmount` is undefined
  - [ ] Add state badge: "Raggiunto" (emerald), "In corso" (amber), "Non avviato" (gray)
  - [ ] Remove the `onUpdate` button from GoalCard — manual current_amount update is obsolete in waterfall mode

- [ ] Task 3 — Update `GoalsSection` to compute and pass waterfall (AC: 1, 4)
  - [ ] Call `useTransactions({})` to get all transactions (no month filter)
  - [ ] Compute `totalBalance = incomeSum - expenseSum`
  - [ ] Call `computeWaterfall(activeGoals, totalBalance)`
  - [ ] Pass `allocatedAmount={waterfallMap.get(goal.id) ?? 0}` to each GoalCard
  - [ ] Keep completed goals section — they show "Completato" badge (existing behavior)

- [ ] Task 4 — Build verification
  - [ ] `npm run build` — zero TypeScript errors
  - [ ] Verify waterfall recalculates after adding a transaction (React Query cache invalidation already handles this)

## Dev Notes

### Waterfall Algorithm (Pure Function)
```typescript
// src/lib/finance/waterfall.ts
import { FinancialGoal } from '@/types'

export function computeWaterfall(
  goals: FinancialGoal[],
  totalBalance: number
): Map<string, number> {
  const result = new Map<string, number>()
  let remaining = Math.max(0, totalBalance)

  // Only allocate to non-completed goals, in position order (already sorted by useFinancialGoals)
  for (const goal of goals) {
    if (goal.completed) continue
    const allocated = Math.min(remaining, goal.target_amount)
    result.set(goal.id, allocated)
    remaining -= allocated
  }

  return result
}
```

### Getting Total Balance in GoalsSection
```typescript
// Call useTransactions without filter to get ALL transactions
const { data: allTransactions = [] } = useTransactions({})

const totalBalance = allTransactions.reduce((sum, t) => {
  return sum + (t.type === 'income' ? t.amount : -t.amount)
}, 0)
```
This is the same formula used in `src/components/home/TotalBalanceWidget.tsx` — single source of truth.

### GoalCard Prop Update
```typescript
interface Props {
  goal: FinancialGoal
  allocatedAmount?: number   // NEW — from waterfall; overrides current_amount display
  onEdit: () => void
  // onUpdate removed — manual current_amount update is replaced by waterfall
}
```
Display logic:
```typescript
const displayAmount = allocatedAmount ?? goal.current_amount
const pct = goal.target_amount > 0 ? Math.min((displayAmount / goal.target_amount) * 100, 100) : 0
```

### State Badge
Add status badge below the progress bar in GoalCard:
```typescript
const state = allocatedAmount !== undefined
  ? allocatedAmount >= goal.target_amount ? 'raggiunto'
    : allocatedAmount > 0 ? 'in-corso'
    : 'non-avviato'
  : null

// Classes:
// raggiunto: text-emerald-400 bg-emerald-400/10
// in-corso: text-amber-400 bg-amber-400/10
// non-avviato: text-gray-500 bg-white/5
```

### GoalUpdateModal Cleanup
`GoalUpdateModal` (manual current_amount entry) is no longer needed in the waterfall flow. However:
- Do NOT delete it in this story — delete it in story 8.3 or leave as dead code for now
- Remove the `onUpdate` prop and `<GoalUpdateModal>` from `GoalsSection` in this story
- The `GoalEditModal` still exists for editing name/target/color/deadline

### React Query Cache — Automatic Recalculation
When `useTransactions` data changes (new transaction added), React Query invalidates `['transactions', {}]` query, causing `GoalsSection` to re-render with new `totalBalance` → waterfall recalculates automatically. No extra logic needed.

### Project Structure Notes
- New file: `src/lib/finance/waterfall.ts` (pure utility, no React)
- Modified: `src/components/finance/GoalCard.tsx` — add `allocatedAmount` prop, state badge
- Modified: `src/components/finance/GoalsSection.tsx` — add transaction fetch + waterfall compute
- `src/hooks/useTransactions.ts` — import and use as-is, no modifications needed
- Finance module color: `emerald` — use `emerald-400/500` for Raggiunto, `amber-400` for In corso

### References
- TotalBalanceWidget balance formula: `src/components/home/TotalBalanceWidget.tsx` lines 28-36
- useTransactions hook: `src/hooks/useTransactions.ts`
- Existing GoalCard: `src/components/finance/GoalCard.tsx`
- Existing GoalsSection: `src/components/finance/GoalsSection.tsx`
- Architecture immutability: create new objects, never mutate

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
