# Story 8.3: Savings Goals — Manual Reordering

Status: ready-for-dev

## Story

As a user,
I want to drag & drop savings goals to change their priority order,
So that I control which goal gets funded first by the waterfall allocation.

## Acceptance Criteria

1. **Given** a list of savings goals **When** I drag a goal to a new position **Then** the order updates immediately (optimistic update) **And** the waterfall allocation recalculates based on the new order.
2. **Given** a drag operation **When** drag ends **Then** new `position` values are persisted via individual `update()` calls (not upsert) for each reordered goal.
3. **Given** a failed DB update during reorder **When** the Supabase call returns an error **Then** the list rolls back to the previous order visually.
4. **Given** mobile users **When** they long-press a goal (>200ms) and drag **Then** the reorder gesture works (`TouchSensor` with `{ delay: 200, tolerance: 8 }`).
5. **Given** a single goal **When** only one goal exists **Then** no drag handle is shown (nothing to reorder).

## Tasks / Subtasks

- [ ] Task 1 — Add `useReorderFinancialGoals` mutation to existing hook (AC: 2, 3)
  - [ ] In `src/hooks/useFinancialGoals.ts`, add `useReorderFinancialGoals()` export
  - [ ] Mutation accepts `newOrder: { id: string; position: number }[]`
  - [ ] Optimistic update: `setQueryData(['financial-goals'], reordered)`
  - [ ] Persistence: `Promise.all` of individual `supabase.from('financial_goals').update({ position: p }).eq('id', id)` calls
  - [ ] `onError`: rollback to snapshot
  - [ ] `onSettled`: `invalidateQueries(['financial-goals'])`

- [ ] Task 2 — Create sortable GoalCard wrapper (AC: 1, 4)
  - [ ] Create `src/components/finance/SortableGoalCard.tsx`
  - [ ] Uses `useSortable({ id: goal.id })` from `@dnd-kit/sortable`
  - [ ] Renders `GoalCard` with `style` transform from `CSS.Transform.toString(transform)`
  - [ ] Shows drag handle icon (`GripVertical` from lucide-react) — visible on hover desktop, always visible mobile
  - [ ] Hide drag handle when only 1 goal total (prop `isDraggable: boolean`)

- [ ] Task 3 — Wrap `GoalsSection` active goals list with DnD context (AC: 1, 4, 5)
  - [ ] Add `DndContext`, `SortableContext`, sensors setup to `GoalsSection`
  - [ ] Sensors: `useSensor(PointerSensor)` + `useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })`
  - [ ] `SortableContext` uses `verticalListSortingStrategy` with `items={activeGoals.map(g => g.id)}`
  - [ ] `onDragEnd`: compute new positions (0-indexed), call `reorderMutation.mutate(newOrder)`
  - [ ] Only wrap active goals — completed goals section is NOT draggable

- [ ] Task 4 — Build verification (AC: 1–5)
  - [ ] `npm run build` — zero TypeScript errors
  - [ ] Verify drag on desktop and test `TouchSensor` delay config
  - [ ] Confirm waterfall recalculates after reorder (React Query invalidation)

## Dev Notes

### useReorderFinancialGoals — Full Pattern
```typescript
export function useReorderFinancialGoals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newOrder: { id: string; position: number }[]) => {
      const supabase = createClient()
      await Promise.all(
        newOrder.map(({ id, position }) =>
          supabase.from('financial_goals').update({ position }).eq('id', id)
            .then(({ error }) => { if (error) throw error })
        )
      )
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<FinancialGoal[]>(QUERY_KEY)
      queryClient.setQueryData<FinancialGoal[]>(QUERY_KEY, (old = []) => {
        const posMap = new Map(newOrder.map(({ id, position }) => [id, position]))
        return [...old]
          .map(g => posMap.has(g.id) ? { ...g, position: posMap.get(g.id)! } : g)
          .sort((a, b) => a.position - b.position)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

### CRITICAL: update() not upsert()
```typescript
// ✅ Correct — individual update preserves all other columns
supabase.from('financial_goals').update({ position }).eq('id', id)

// ❌ WRONG — upsert with partial fields sets unspecified fields to NULL
supabase.from('financial_goals').upsert({ id, position })
```
This is a documented architectural anti-pattern in the project.

### onDragEnd Position Computation
```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return

  const oldIndex = activeGoals.findIndex(g => g.id === active.id)
  const newIndex = activeGoals.findIndex(g => g.id === over.id)
  const reordered = arrayMove(activeGoals, oldIndex, newIndex)
  const newOrder = reordered.map((g, i) => ({ id: g.id, position: i }))
  reorderMutation.mutate(newOrder)
}
```
`arrayMove` from `@dnd-kit/sortable` — already imported, no extra package.

### SortableGoalCard Skeleton
```typescript
'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { GoalCard } from './GoalCard'
import { FinancialGoal } from '@/types'

interface Props {
  goal: FinancialGoal
  allocatedAmount?: number
  onEdit: () => void
  isDraggable: boolean
}

export function SortableGoalCard({ goal, allocatedAmount, onEdit, isDraggable }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isDraggable && (
        <div {...attributes} {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-gray-600 hover:text-gray-400 z-10">
          <GripVertical size={14} />
        </div>
      )}
      <GoalCard goal={goal} allocatedAmount={allocatedAmount} onEdit={onEdit} />
    </div>
  )
}
```

### GoalsSection DnD Sensors
```typescript
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
)
```
These are the same sensor settings used in the Kanban DnD (now removed in story 7.1) — reuse the pattern.

### Completed Goals — No DnD
Only the `activeGoals` grid is wrapped in `DndContext` + `SortableContext`. The `completedGoals` section at the bottom remains a plain grid — no drag needed.

### Project Structure Notes
- New file: `src/components/finance/SortableGoalCard.tsx`
- Modified: `src/hooks/useFinancialGoals.ts` — add `useReorderFinancialGoals`
- Modified: `src/components/finance/GoalsSection.tsx` — add DnD context + SortableGoalCard
- Finance module color: `emerald`
- dnd-kit already in package.json (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)

### References
- DnD pattern: CLAUDE.md "Modulo 3 — Progetti (Kanban)" — useSortable/TouchSensor pattern
- Architecture: `_bmad-output/planning_artifacts/architecture.md` — "Supabase Client — Update vs Upsert"
- Optimistic update pattern: `src/hooks/useReminders.ts` (completeMutation onMutate/onError)
- `arrayMove` from `@dnd-kit/sortable` — no extra import needed

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
