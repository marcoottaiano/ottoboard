# Story 2.4: In-App Notification Center Fallback

Status: done

## Story

As a user,
I want to see an in-app Notification Center on the home dashboard when push notifications are disabled,
So that I can still review and act on my reminders even without system-level push.

## Acceptance Criteria

1. **Given** push notifications are blocked or not supported by the browser
   **When** I open the home dashboard
   **Then** the RemindersWidget displays all due and upcoming reminders sorted by `due_date` ASC as the primary fallback

2. **Given** I have reminders due today or overdue
   **When** I view the RemindersWidget
   **Then** overdue reminders are visually distinguished (red date/title) from future ones

3. **Given** push is disabled and I have no reminders today
   **When** I view the RemindersWidget
   **Then** an empty state is shown: "Nessun promemoria in scadenza" with a prominent `[+ Aggiungi]` CTA button

## Tasks / Subtasks

- [x] Update empty state in `RemindersWidget.tsx` to match AC3 (AC: 3)
  - [x] Change text from "Nessun promemoria in sospeso" to "Nessun promemoria in scadenza"
  - [x] Replace plain text with an actionable empty state including `[+ Aggiungi]` button that opens `ReminderCreateModal`
- [x] Verify overdue visual in `ReminderRow.tsx` is sufficient for AC2 (AC: 2)
  - [x] Confirm `text-red-400` on title + date span — no additional badge needed
- [x] Verify `usePendingReminders` sorts by `due_date` ASC (AC: 1) — confirm no change needed

## Dev Notes

### ⚠️ CRITICAL: Most of This Is Already Implemented

Audit before writing any code:

| AC | Component | Current State | Delta |
|----|-----------|---------------|-------|
| AC1: sorted by due_date ASC | `usePendingReminders` | `.order('due_date', { ascending: true })` ✅ | None |
| AC1: displays all pending | `RemindersWidget` | Renders all `pending` from hook ✅ | None |
| AC2: overdue visual (red) | `ReminderRow` | `isOverdue()` → `text-red-400` on title + date ✅ | None |
| AC3: empty state with CTA | `RemindersWidget` | Text only, no button ❌ | Fix needed |

**Only one change needed:** Update the empty state in `RemindersWidget`.

### The One Fix: Empty State

```tsx
// CURRENT — no CTA, wrong text
) : pending.length === 0 ? (
  <p className="text-xs text-gray-600">Nessun promemoria in sospeso</p>
) : (
```

```tsx
// TARGET — actionable empty state
) : pending.length === 0 ? (
  <div className="flex flex-col items-start gap-2">
    <p className="text-xs text-gray-600">Nessun promemoria in scadenza</p>
    <button
      onClick={() => setShowCreate(true)}
      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
    >
      + Aggiungi promemoria
    </button>
  </div>
) : (
```

- Color: `text-purple-400` — matches the `CheckSquare` icon and widget header (purple is the reminders/home module accent in this widget)
- `setShowCreate(true)` is already used by the header `+ Aggiungi` button — reuse the same state

### "Push disabled" is implicit — no conditional rendering

The fallback behavior is **not** a separate component. The `RemindersWidget` is always visible on the home dashboard regardless of push permission state. AC1 is satisfied by the widget's existing presence.

The AC describes the widget's role as a fallback, not a conditional display. Do NOT add push-permission checks to `RemindersWidget`.

### Overdue Visual — Already Correct

`ReminderRow` already has:
```typescript
function isOverdue(dateStr: string): boolean {
  const parts = dateStr.split('-').map(Number)   // ✅ local date, no UTC shift
  const due = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

// In JSX:
<span className={`text-sm ${overdue ? 'text-red-400' : 'text-white/80'}`}>
  {reminder.title}
</span>
<span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-600'}`}>
  {formatDueDate(reminder.due_date)}
</span>
```

The AC says "e.g., red date badge" — the existing `text-red-400` on both title and date is sufficient. No badge component needed.

### Project Structure Notes

- **Edit only**: `src/components/home/RemindersWidget.tsx` — replace empty state (~1 line → ~6 lines)
- No migrations, no new files, no hook changes

### Design Alignment

- Empty state CTA uses `text-purple-400` consistent with widget header `CheckSquare` icon color
- Follows UX spec: "every new component must implement: default, loading/skeleton, empty+CTA, error+recovery" — this closes the missing `empty+CTA` gap
- Mobile: button is already `text-xs` with adequate touch target via the flex container

### References

- [Source: src/components/home/RemindersWidget.tsx] — current empty state to replace
- [Source: src/components/home/ReminderRow.tsx] — overdue logic already correct
- [Source: src/hooks/useReminders.ts] — `usePendingReminders` sort order confirmed ASC
- [Source: ux-design-specification.md#Component Implementation Strategy] — "empty+CTA required for every component"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(none)

### Completion Notes List

- AC1 verified: `usePendingReminders` already uses `.order('due_date', { ascending: true })` — no change needed.
- AC2 verified: `ReminderRow` already applies `text-red-400` to title and date for overdue items via `isOverdue()` — no change needed.
- AC3 implemented: updated empty state in `RemindersWidget.tsx` — changed text to "Nessun promemoria in scadenza" and added `[+ Aggiungi promemoria]` button using existing `setShowCreate(true)` state, styled with `text-purple-400` consistent with widget header accent color.
- TypeScript compilation passes with no errors.

### File List

- src/components/home/RemindersWidget.tsx (modified)
