# Story 2.3: Recurring Reminder Auto-Generation

Status: ready-for-dev

## Story

As a user,
I want a new occurrence of a recurring reminder to be created automatically when I complete it,
So that I don't have to manually recreate recurring reminders each time.

## Acceptance Criteria

1. **Given** I mark a recurring reminder (daily/weekly/monthly/yearly) as complete
   **When** the completion is saved
   **Then** a new reminder is created with `completed = false`, `notified_at = NULL`, and `due_date` advanced by the recurrence interval
   **And** all other fields (title, notes, priority, recurrence, due_time) are inherited from the original

2. **Given** the recurrence is `monthly` and the original `due_date` is the 31st
   **When** the next month has fewer than 31 days
   **Then** the new `due_date` is set to the last day of the next month (no invalid date, no rollover to following month)

3. **Given** I complete a non-recurring reminder
   **When** the completion is saved
   **Then** no new reminder is created

## Tasks / Subtasks

- [ ] Fix `calcNextDueDate` monthly edge case in `src/hooks/useReminders.ts` (AC: 2)
  - [ ] Replace current `d.setMonth(d.getMonth() + 1)` with day-clamping logic
  - [ ] Clamp to last day of target month when original day > days in target month
- [ ] Verify `useCompleteReminder` inserts new reminder with `notified_at` implicitly NULL (AC: 1)
  - [ ] Confirm `notified_at` is NOT included in the insert payload → DB DEFAULT = NULL ✅
- [ ] Verify rollback logic on failed insert still works after the fix (AC: 1)

## Dev Notes

### ⚠️ CRITICAL: Logic Already Exists — One Bug to Fix

`useCompleteReminder` in `src/hooks/useReminders.ts` is **already fully implemented** and handles AC1 and AC3 correctly. **Do not rewrite it.**

The only defect is in `calcNextDueDate` for the `'monthly'` case.

### The Bug: Monthly Rollover

```typescript
// CURRENT — BUG: JS rolls over to following month
case 'monthly':
  d.setMonth(d.getMonth() + 1)
  break
// Jan 31 → setMonth(1) → Feb 31 → JS auto-corrects to Mar 3 ❌
// Expected: Jan 31 → Feb 28 ✅
```

### The Fix

```typescript
case 'monthly': {
  const origDay = d.getDate()
  d.setDate(1)                          // prevent overflow during month change
  d.setMonth(d.getMonth() + 1)          // advance month safely
  const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(origDay, lastDayOfMonth))  // clamp to last valid day
  break
}
```

Test cases to verify:
- Jan 31 → Feb 28 (non-leap) or Feb 29 (leap)
- Jan 28 → Feb 28 (unchanged — normal month)
- Mar 31 → Apr 30
- Dec 31 → Jan 31 (year rollover + 31 days — works)

### Verify: `notified_at = NULL` on New Reminder

The insert payload in `useCompleteReminder`:
```typescript
await supabase.from('reminders').insert({
  title: reminder.title,
  notes: reminder.notes,
  due_date: nextDue,
  due_time: reminder.due_time,
  priority: reminder.priority,
  recurrence: reminder.recurrence,
  // notified_at NOT included → DB column default = NULL ✅
  // completed NOT included → DB column default = false ✅
})
```
This is already correct — `notified_at` defaults to NULL in the DB schema. No change needed.

### Verify: Rollback on Failed Insert

```typescript
if (createError) {
  // Rolls back completion if new reminder insert fails
  await supabase.from('reminders')
    .update({ completed: false, completed_at: null })
    .eq('id', reminder.id)
  throw createError
}
```
This is already correct. No change needed.

### `calcNextDueDate` — Full Function After Fix

For reference, the complete corrected function:

```typescript
function calcNextDueDate(dueDate: string, recurrence: ReminderRecurrence): string {
  const parts = dueDate.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])  // local date — correct

  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly': {
      const origDay = d.getDate()
      d.setDate(1)
      d.setMonth(d.getMonth() + 1)
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(origDay, lastDayOfMonth))
      break
    }
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

Note: `yearly` on Feb 29 (leap) → Feb 28 next year if non-leap: JS handles this automatically with `setFullYear`. No fix needed for yearly.

### Project Structure Notes

- **Edit only**: `src/hooks/useReminders.ts` — change ~3 lines inside `calcNextDueDate`
- No migrations, no new files, no component changes

### References

- [Source: CLAUDE.md#Modulo 10 — Linear + Reminders] — recurrence intervals spec
- [Source: src/hooks/useReminders.ts] — `calcNextDueDate` + `useCompleteReminder` existing implementation
- [Source: CLAUDE.md#Gotcha Tecnici — Date & Timezone] — use local date parsing (already done correctly with `split('-').map(Number)`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
