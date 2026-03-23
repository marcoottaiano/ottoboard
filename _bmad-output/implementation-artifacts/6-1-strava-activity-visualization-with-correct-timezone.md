# Story 6.1: Strava Activity Visualization with Correct Timezone

Status: review

## Story

As a user in a non-UTC timezone (e.g., CET/UTC+1),
I want my Strava activities to be displayed on the correct local calendar day,
So that activities completed late at night don't appear shifted to the next day.

## Acceptance Criteria

1. **Given** a Strava activity has `start_date` stored in UTC **When** displayed in `ActivityHeatmap`, `ActivityList`, or `LastActivityCard` **Then** the date uses `toLocalDateStr()` — never `toISOString().slice(0,10)`

2. **Given** I am in UTC+1 (CET) and completed a run at 23:30 local time **When** the activity appears in the heatmap **Then** the cell for that local calendar day is highlighted, not the next day

3. **Given** I hover over a heatmap cell **When** the tooltip renders **Then** the date is formatted in locale style (e.g., "Lun 15 Gen 2026") using local date parts

4. **Given** the ActivityList shows a date column **When** any row renders **Then** the date is derived with `toLocalDateStr()` and formatted for display

## Tasks / Subtasks

- [x] Audit all date usages in fitness components (AC: #1)
  - [x] Search for `toISOString().slice(0, 10)` in `src/components/fitness/` and `src/hooks/`
  - [x] Replace every occurrence with `toLocalDateStr()` from `src/lib/dateUtils.ts`
- [x] Fix `ActivityHeatmap.tsx` (AC: #2, #3)
  - [x] Verify cell date key generation uses `toLocalDateStr(new Date(activity.start_date))`
  - [x] Verify tooltip date formatting uses local date parts (getFullYear/getMonth/getDate)
- [x] Fix `ActivityList.tsx` (AC: #4)
  - [x] Verify date column formatting uses `toLocalDateStr()` or equivalent local formatter
- [x] Fix `LastActivityCard.tsx` (AC: #1)
  - [x] Verify displayed date uses local date — not UTC
- [x] Verify no regression in heatmap year navigation and future-cell transparency logic

## Dev Notes

- **`toLocalDateStr` location:** `src/lib/dateUtils.ts` — import from there, do NOT redefine
- **Pattern to find and replace:**
  ```typescript
  // ❌ Remove all occurrences of:
  new Date(activity.start_date).toISOString().slice(0, 10)

  // ✅ Replace with:
  toLocalDateStr(new Date(activity.start_date))
  ```
- **ActivityHeatmap gotcha:** `overflow-x-auto` MUST be paired with `overflow-y-hidden` on the same element — do not remove this pairing
- **Heatmap cell key:** must be the local date string, not UTC ISO string, for correct cell lookup
- **Tooltip date format:** use `getFullYear()`, `getMonth()`, `getDate()` — never `toISOString()`
- This story is a focused bug-fix: **do not refactor chart components** beyond fixing the date issue

### Project Structure Notes

- Touch only: `src/components/fitness/ActivityHeatmap.tsx`, `ActivityList.tsx`, `LastActivityCard.tsx`
- Also check: `src/hooks/useActivities.ts` if date processing happens there
- `toLocalDateStr` is already in `src/lib/dateUtils.ts` — do NOT create a new utility

### References

- [Source: CLAUDE.md#Gotcha-Tecnici] — `toLocalDateStr` pattern, UTC shift in CET
- [Source: architecture.md#Format-Patterns-Date] — date formatting rules
- [Source: CLAUDE.md#ActivityHeatmap] — overflow-y-hidden requirement, tooltip format

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- **ActivityHeatmap.tsx**: Removed the locally-defined `toLocalDateStr` function and replaced it with an import from `src/lib/dateUtils.ts`. Fixed the `activityMap` building in `buildGrid()` to use `toLocalDateStr(new Date(a.start_date))` instead of `a.start_date.slice(0, 10)` — this was the primary bug causing activities completed at e.g. 23:30 CET to be mapped to the wrong (UTC) day. The tooltip `formatCellDate` was already correct (parses the ISO key string using local `new Date(y, m-1, d)` constructor, not `toISOString()`). The `overflow-x-auto` / `overflow-y-hidden` pairing was not touched.
- **ActivityList.tsx**: Added import of `toLocalDateStr` from `src/lib/dateUtils.ts`. Fixed the `after` filter date calculation (used for the period filter: 30/90/180/365 days) from `new Date(...).toISOString().slice(0, 10)` to `toLocalDateStr(new Date(...))`. The date display in the table already used `toLocaleDateString('it-IT', ...)` which is locale/timezone-aware and did not require changes.
- **LastActivityCard.tsx**: No code changes required. The `formatDate` function already uses `new Date(iso).toLocaleDateString('it-IT', { weekday, day, month })` which correctly renders the local date — no UTC shift.
- **useActivities.ts**: No code changes required. The hook accepts pre-computed date strings as filter parameters; date string generation is the responsibility of each calling component.

### File List

- src/components/fitness/ActivityHeatmap.tsx
- src/components/fitness/ActivityList.tsx
