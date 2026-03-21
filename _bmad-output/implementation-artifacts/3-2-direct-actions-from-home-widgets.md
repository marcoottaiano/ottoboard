# Story 3.2: Direct Actions from Home Widgets

Status: ready-for-dev

## Story

**As a user,**
I want to complete core actions (check off a reminder, mark a habit, drag a Linear task) directly from the home dashboard,
so that I can finish the morning loop without navigating to module pages.

## Acceptance Criteria

1. **Given** the RemindersWidget is on the home dashboard, **When** I tap the checkbox next to a reminder, **Then** the reminder is marked complete with an optimistic update (immediate visual feedback, no loading state), **And** if the server mutation fails, the checkbox rolls back automatically with a toast error.
2. **Given** the HabitsWidget is on the home dashboard and today is a scheduled day for a habit, **When** I tap the completion checkbox for a habit, **Then** the habit is toggled with an optimistic update, **And** the streak counter updates immediately.
3. **Given** the KanbanColumnWidget is on the home dashboard, **When** I tap a task card, **Then** a task detail modal opens in-place (no navigation to /projects).

## Tasks / Subtasks

### AC1 — Add optimistic update + rollback + toast error to `useCompleteReminder`

- [ ] **Task 1.1** — Open `src/hooks/useReminders.ts` and add `onMutate`, `onError`, and update `onSuccess`/`onSettled` to `useCompleteReminder`.
  - In `onMutate`: cancel queries for `PENDING_KEY`, snapshot previous data, optimistically remove the completed reminder from the pending list via `queryClient.setQueryData`.
  - In `onError`: restore the snapshot via `queryClient.setQueryData(PENDING_KEY, context?.previous)`, then call `toast.error('Operazione non riuscita, riprova')`.
  - Change `onSuccess` to `onSettled` (or keep both) to always call `invalidateBoth(queryClient)` regardless of outcome.
  - The `mutationFn` already accepts a full `Reminder` object — no signature change required.

- [ ] **Task 1.2** — Verify `RemindersWidget.tsx` passes the full `Reminder` object (not just `id`) to `completeReminder.mutate`. It already does (`completeReminder.mutate(reminder)`), but confirm the `onComplete` callback in `ReminderRow` matches the new hook signature.
  - `ReminderRow.onComplete` currently receives `id: string` → `RemindersWidget` looks up the full object via `pending.find(p => p.id === id)`. This flow is correct — no changes needed in `ReminderRow` or `RemindersWidget` for the callback shape.

- [ ] **Task 1.3** — Confirm `sonner` is the toast library in use (already imported in `src/components/projects/TaskDetailModal.tsx` as `import { toast } from 'sonner'`). Add the same import to `useReminders.ts`.

### AC2 — Confirm HabitsWidget is already correct (no implementation needed)

- [ ] **Task 2.1** — Read-only verification: `useToggleCompletion` in `src/hooks/useHabits.ts` already implements full optimistic update with `onMutate`/`onError`/`onSettled`. HabitsWidget already uses `togglingId` state to prevent double-tap. **No code changes required for AC2.**

### AC3 — Make task cards in KanbanColumnWidget clickable and open TaskDetailModal

- [ ] **Task 3.1** — Open `src/components/home/KanbanColumnWidget.tsx`. Add local state `const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)`.

- [ ] **Task 3.2** — Convert each task `<div>` in the task list to a `<button>` (or add `onClick` + `cursor-pointer` + `role="button"`) that calls `setSelectedTaskId(task.id)` on click.
  - Apply `cursor-pointer` to the task row element.
  - Keep existing classes: `flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors`.

- [ ] **Task 3.3** — Import and render `TaskDetailModal` from `src/components/projects/TaskDetailModal.tsx` at the bottom of `KanbanColumnWidget`.
  - Render conditionally: `{selectedTaskId && config.projectId && (<TaskDetailModal taskId={selectedTaskId} projectId={config.projectId} onClose={() => setSelectedTaskId(null)} />)}`.
  - `config.projectId` is already available via the `config` prop.

- [ ] **Task 3.4** — Add Escape key handler to close the modal. The existing `TaskDetailModal` does not have a keyboard listener — add one via `useEffect` inside `KanbanColumnWidget` (not inside the modal, to keep the modal reusable):
  ```typescript
  useEffect(() => {
    if (!selectedTaskId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedTaskId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedTaskId])
  ```

## Dev Notes

### AC1 — Precise gap in `useCompleteReminder`

The current implementation (`src/hooks/useReminders.ts`, lines 114–151) has **no optimistic update**. When the user taps the checkbox:
1. The UI does not change immediately — the reminder stays visible until the Supabase call returns.
2. On network error, the mutation simply fails silently (no toast, no rollback needed because nothing was updated optimistically).

The fix requires adding the standard TanStack Query optimistic update pattern:

```typescript
export function useCompleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      // ... existing mutationFn body unchanged ...
    },
    onMutate: async (reminder) => {
      await queryClient.cancelQueries({ queryKey: PENDING_KEY })
      const previous = queryClient.getQueryData<Reminder[]>(PENDING_KEY)
      // Optimistically remove from pending list
      queryClient.setQueryData<Reminder[]>(PENDING_KEY, (old) =>
        (old ?? []).filter((r) => r.id !== reminder.id)
      )
      return { previous }
    },
    onError: (_err, _reminder, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PENDING_KEY, context.previous)
      }
      toast.error('Operazione non riuscita, riprova')
    },
    onSettled: () => invalidateBoth(queryClient),
  })
}
```

Note: `onSuccess` is replaced by `onSettled` so that `invalidateBoth` runs regardless of success/failure. This ensures the query cache is always fresh after the operation.

### AC2 — HabitsWidget already compliant

`useToggleCompletion` (lines 158–202 of `src/hooks/useHabits.ts`) already implements:
- `onMutate`: cancels queries, snapshots previous data, flips `completedToday` optimistically.
- `onError`: restores snapshot.
- `onSettled`: invalidates both habits and completions queries.

The streak counter updates on the next `onSettled` invalidation (full recalculation from DB), not optimistically — this is intentional and correct per the existing comment: "streak is recalculated correctly in onSettled".

### AC3 — TaskDetailModal is a full edit modal — use it as-is

`src/components/projects/TaskDetailModal.tsx` is a full edit modal (title, description, priority, column, labels, Linear sync, delete). The story says "read-only + link to Linear" but the existing component already provides exactly the right UX for the home context:

- It reads data from the React Query cache (`queryClient.getQueryData<Task[]>(['tasks', projectId])`) — no extra fetch needed.
- It shows the Linear identifier and link to Linear (`task.linear_issue_url`).
- It supports editing fields with auto-save on blur — this is acceptable in the home context and avoids duplicating a read-only variant.
- It handles its own overlay (`fixed inset-0 z-50 ...`) — no wrapper needed.

**Do NOT create a new `src/components/home/TaskDetailModal.tsx`** — reuse the existing one from `src/components/projects/TaskDetailModal.tsx`.

The modal's interface is:
```typescript
interface Props {
  taskId: string
  projectId: string
  onClose: () => void
}
```

Both `taskId` and `projectId` are available inside `KanbanColumnWidget` (`task.id` from the task list, `config.projectId` from the widget config).

### Query cache availability

`KanbanColumnWidget` calls `useTasks(projectId ?? null)` which populates the React Query cache under `['tasks', projectId]`. The `TaskDetailModal` reads from this same cache key. As long as `KanbanColumnWidget` has loaded its tasks before the user clicks a card, the modal will find the task. The loading state guard (`isLoading` skeleton) ensures tasks are rendered only after the query resolves.

### Toast library

The project uses `sonner`. Confirmed via import in `src/components/projects/TaskDetailModal.tsx`:
```typescript
import { toast } from 'sonner'
```
Add the same import to `src/hooks/useReminders.ts`.

### Immutability

All state updates must follow immutable patterns (no in-place mutation of arrays/objects). Use `.filter()`, `.map()`, spread operators. The optimistic update example above already follows this pattern.

### Project Structure Notes

```
src/
├── hooks/
│   └── useReminders.ts              ← MODIFY: add optimistic update to useCompleteReminder
├── components/
│   ├── home/
│   │   ├── RemindersWidget.tsx      ← READ ONLY (no changes needed)
│   │   ├── ReminderRow.tsx          ← READ ONLY (no changes needed)
│   │   ├── HabitsWidget.tsx         ← READ ONLY (already correct)
│   │   └── KanbanColumnWidget.tsx   ← MODIFY: add selectedTaskId state + onClick + modal render
│   └── projects/
│       └── TaskDetailModal.tsx      ← REUSE AS-IS (no changes needed)
```

### References

- `src/hooks/useReminders.ts` — `useCompleteReminder` (lines 114–151): missing `onMutate`/`onError`
- `src/hooks/useHabits.ts` — `useToggleCompletion` (lines 158–202): reference implementation of correct optimistic update pattern
- `src/components/home/KanbanColumnWidget.tsx` — task list div (lines 62–71): needs `onClick` + `cursor-pointer`
- `src/components/projects/TaskDetailModal.tsx` — existing modal to reuse (Props: `taskId`, `projectId`, `onClose`)
- `src/components/home/RemindersWidget.tsx` — already passes full `Reminder` object to `completeReminder.mutate`
- `src/components/home/ReminderRow.tsx` — checkbox `onComplete(reminder.id)` callback: shape is correct

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `src/hooks/useReminders.ts` (modified)
- `src/components/home/KanbanColumnWidget.tsx` (modified)
