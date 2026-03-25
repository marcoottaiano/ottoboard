# Story 8.1: Savings Goals — Data Model & CRUD

Status: done

## Story

As a user,
I want to create, edit, and delete savings goals with a name and target amount,
So that I can define what I'm saving for.

## Acceptance Criteria

1. **Given** the Finance page **When** I navigate to the "Obiettivi di risparmio" section **Then** I see a list of my savings goals (empty state if none) **And** a "Nuovo" button is visible — **ALREADY MET** by existing `GoalsSection` + `GoalCard` components.
2. **Given** the goal creation form **When** I enter a name and target amount and save **Then** the goal appears in the list with a correct `position` value — **ALREADY MET** by `GoalCreateModal`, BUT `position` field must be set on create.
3. **Given** an existing goal **When** I click edit and change name or amount **Then** the change is saved immediately (optimistic update) — **ALREADY MET** by `GoalEditModal` + `useUpdateFinancialGoal`.
4. **Given** an existing goal **When** I click delete and confirm **Then** the goal is removed — **ALREADY MET** by `GoalEditModal` + `useDeleteFinancialGoal`.
5. **Given** the `financial_goals` table **When** a migration runs **Then** a `position INT NOT NULL DEFAULT 0` column exists **And** existing rows have sequential positions based on `created_at` order.
6. **Given** `useFinancialGoals` **When** fetching goals **Then** results are ordered by `position ASC` (not `created_at`).
7. **Given** `GoalCreateModal` **When** a new goal is created **Then** `position` is set to `(count of existing goals)` so it appears at the end of the list.

## Tasks / Subtasks

- [x] Task 1 — Database migration (AC: 5)
  - [x] Create `supabase/migrations/20260326000000_add_position_to_financial_goals.sql`
  - [x] SQL: `ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;`
  - [x] Backfill: `UPDATE financial_goals SET position = sub.rn - 1 FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn FROM financial_goals) sub WHERE financial_goals.id = sub.id;`
  - [x] Apply migration via Supabase MCP

- [x] Task 2 — Update TypeScript types (AC: 5, 6)
  - [x] In `src/types/index.ts`: add `position: number` to `FinancialGoal` interface
  - [x] Add `position` to `CreateFinancialGoalInput` (remove from Omit or add explicitly)
  - [x] Regenerate Supabase types if `src/lib/supabase/types.ts` exists — N/A (no generated types file)

- [x] Task 3 — Update `useFinancialGoals` ordering (AC: 6)
  - [x] In `src/hooks/useFinancialGoals.ts`: change `.order('created_at', { ascending: true })` → `.order('position', { ascending: true })`

- [x] Task 4 — Update `GoalCreateModal` to set position (AC: 7)
  - [x] In `GoalCreateModal`, read current goals count from `useFinancialGoals()` (or pass as prop)
  - [x] On create: set `position: existingGoals.length` (so new goal goes to end)
  - [x] Do NOT use `current_amount` in `CreateFinancialGoalInput` — it's derived from waterfall in story 8.2

- [x] Task 5 — Build verification
  - [x] Run `npm run build` — zero errors
  - [x] Verify `position` appears in `financial_goals` fetches and in GoalCard props chain

## Dev Notes

### CRITICAL: Table is `financial_goals`, not `savings_goals`
The codebase already uses `financial_goals` as the table name. The original spec says `savings_goals` but the existing implementation chose `financial_goals`. Keep this name — do NOT create a new table.

### What Already Exists — Do NOT Recreate
All of the following are fully implemented and working:
- `src/hooks/useFinancialGoals.ts` — CRUD hooks
- `src/components/finance/GoalCard.tsx` — goal display card
- `src/components/finance/GoalCreateModal.tsx` — create modal
- `src/components/finance/GoalEditModal.tsx` — edit/delete modal
- `src/components/finance/GoalUpdateModal.tsx` — update current_amount modal
- `src/components/finance/GoalsSection.tsx` — section container (already in `finance/page.tsx`)
- `FinancialGoal`, `CreateFinancialGoalInput`, `UpdateFinancialGoalInput` types in `src/types/index.ts`

### Migration Pattern (ALTER, not CREATE)
The `financial_goals` table already exists. This migration only ADDS the `position` column:
```sql
-- Add position column for waterfall ordering (stories 8.2, 8.3)
ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Backfill sequential positions per user ordered by created_at
UPDATE financial_goals
SET position = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM financial_goals
) sub
WHERE financial_goals.id = sub.id;
```

### RLS Verification
The `financial_goals` table should already have RLS (used without issues by existing code). Verify but do not recreate:
```sql
-- Should already exist — verify only
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'financial_goals';
```
If missing: apply the standard pattern with `DEFAULT auth.uid()` + `USING + WITH CHECK`.

### Type Update
```typescript
// src/types/index.ts — add position to FinancialGoal
export interface FinancialGoal {
  id: string
  user_id: string
  name: string
  icon: string | null
  target_amount: number
  current_amount: number  // kept for now; story 8.2 will make this derived
  deadline: string | null
  color: string | null
  completed: boolean
  position: number        // NEW — used for waterfall order (story 8.2) and DnD (story 8.3)
  created_at: string
}

// CreateFinancialGoalInput: position should be included
export type CreateFinancialGoalInput = Omit<FinancialGoal, 'id' | 'user_id' | 'completed' | 'created_at'>
// This auto-includes position since it's no longer in Omit
```

### GoalCreateModal — Position Setting
```typescript
// In GoalCreateModal: set position = number of existing active goals
const { data: goals = [] } = useFinancialGoals()
// On submit:
await createGoal({ ...formData, position: goals.length })
```

### Project Structure Notes
- Migration: `supabase/migrations/20260326000000_add_position_to_financial_goals.sql`
- Types: `src/types/index.ts` (lines ~156-183)
- Hook: `src/hooks/useFinancialGoals.ts`
- Component: `src/components/finance/GoalCreateModal.tsx`
- Finance module color: `emerald` — already correctly used in all goal components

### References
- Existing goal components: `src/components/finance/Goal*.tsx`
- Hook pattern: `src/hooks/useReminders.ts` (same React Query pattern)
- RLS pattern: `_bmad-output/planning_artifacts/architecture.md` — "RLS — Ogni Nuova Tabella"
- Migration examples: `supabase/migrations/20260323100000_create_body_measurements.sql`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. All tasks completed in one pass.

### Completion Notes List

- ✅ Migration `20260326000000_add_position_to_financial_goals.sql` created and applied via Supabase MCP: `position INT NOT NULL DEFAULT 0` added to `financial_goals`, existing rows backfilled with sequential positions per user ordered by `created_at ASC`.
- ✅ `FinancialGoal` interface in `src/types/index.ts` updated: `position: number` added. `CreateFinancialGoalInput` automatically includes `position` since it uses `Omit<..., 'id' | 'user_id' | 'completed' | 'created_at'>`.
- ✅ `useFinancialGoals` now orders by `position ASC` instead of `created_at ASC`.
- ✅ `GoalCreateModal` updated: imports `useFinancialGoals`, reads `goals.length`, passes `position: goals.length` on create so new goals append at the end of the list.
- ✅ `src/lib/supabase/types.ts` does not exist — types are managed manually in `src/types/index.ts`. No regeneration needed.
- ✅ `npm run build` completed successfully with 0 errors.
- ✅ Code review (bmad-code-review) run post-implementation — 2 patch bugs fixed:
  - `useFinancialGoals`: added secondary sort key `.order('created_at', { ascending: true })` as tiebreaker for deterministic ordering when two goals share the same position.
  - `GoalCreateModal`: added `!goalsLoading` guard to `canSubmit` to prevent submitting while goals data is loading (would assign `position: 0` incorrectly).

### File List

- `supabase/migrations/20260326000000_add_position_to_financial_goals.sql` (new)
- `src/types/index.ts` (modified — added `position: number` to `FinancialGoal`)
- `src/hooks/useFinancialGoals.ts` (modified — ordering changed to `position ASC`, added `created_at` tiebreaker)
- `src/components/finance/GoalCreateModal.tsx` (modified — imports `useFinancialGoals`, sets `position` on create, guards canSubmit with `!goalsLoading`)

### Change Log

- Added `position` column to `financial_goals` table and backfilled existing rows (Story 8.1) — Date: 2026-03-25
- Fixed 2 code review findings: deterministic ordering tiebreaker + loading guard in create modal — Date: 2026-03-25
