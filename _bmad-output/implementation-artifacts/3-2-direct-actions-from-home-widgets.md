# Story 3.2: Direct Actions from Home Widgets

Status: review

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

- [x] **Task 1.1** — Open `src/hooks/useReminders.ts` and add `onMutate`, `onError`, and update `onSuccess`/`onSettled` to `useCompleteReminder`.
  - In `onMutate`: cancel queries for `PENDING_KEY`, snapshot previous data, optimistically remove the completed reminder from the pending list via `queryClient.setQueryData`.
  - In `onError`: restore the snapshot via `queryClient.setQueryData(PENDING_KEY, context?.previous)`, then call `toast.error('Operazione non riuscita, riprova')`.
  - Change `onSuccess` to `onSettled` (or keep both) to always call `invalidateBoth(queryClient)` regardless of outcome.
  - The `mutationFn` already accepts a full `Reminder` object — no signature change required.

- [x] **Task 1.2** — Verify `RemindersWidget.tsx` passes the full `Reminder` object (not just `id`) to `completeReminder.mutate`. It already does (`completeReminder.mutate(reminder)`), but confirm the `onComplete` callback in `ReminderRow` matches the new hook signature.
  - `ReminderRow.onComplete` currently receives `id: string` → `RemindersWidget` looks up the full object via `pending.find(p => p.id === id)`. This flow is correct — no changes needed in `ReminderRow` or `RemindersWidget` for the callback shape.

- [x] **Task 1.3** — Confirm `sonner` is the toast library in use (already imported in `src/components/projects/TaskDetailModal.tsx` as `import { toast } from 'sonner'`). Add the same import to `useReminders.ts`.

### AC2 — Confirm HabitsWidget is already correct (no implementation needed)

- [x] **Task 2.1** — Read-only verification: `useToggleCompletion` in `src/hooks/useHabits.ts` already implements full optimistic update with `onMutate`/`onError`/`onSettled`. HabitsWidget already uses `togglingId` state to prevent double-tap. **No code changes required for AC2.**

### AC3 — Make task cards in KanbanColumnWidget clickable and open TaskDetailModal

- [x] **Task 3.1** — Open `src/components/home/KanbanColumnWidget.tsx`. Add local state `const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)`.

- [x] **Task 3.2** — Convert each task `<div>` in the task list to a `<button>` (or add `onClick` + `cursor-pointer` + `role="button"`) that calls `setSelectedTaskId(task.id)` on click.
  - Apply `cursor-pointer` to the task row element.
  - Keep existing classes: `flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors`.

- [x] **Task 3.3** — Import and render `TaskDetailModal` from `src/components/projects/TaskDetailModal.tsx` at the bottom of `KanbanColumnWidget`.
  - Render conditionally: `{selectedTaskId && config.projectId && (<TaskDetailModal taskId={selectedTaskId} projectId={config.projectId} onClose={() => setSelectedTaskId(null)} />)}`.
  - `config.projectId` is already available via the `config` prop.

- [x] **Task 3.4** — Add Escape key handler to close the modal. The existing `TaskDetailModal` does not have a keyboard listener — add one via `useEffect` inside `KanbanColumnWidget` (not inside the modal, to keep the modal reusable):
  ```typescript
  useEffect(() => {
    if (!selectedTaskId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedTaskId(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedTaskId])
  ```

## Dev Notes

...
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- Implemented optimistic update for useCompleteReminder with rollback and toast error.
- Verified HabitsWidget already supports optimistic updates.
- Made KanbanColumnWidget tasks clickable, opening TaskDetailModal in-place with escape key support.

### File List
- `src/hooks/useReminders.ts`
- `src/components/home/KanbanColumnWidget.tsx`
