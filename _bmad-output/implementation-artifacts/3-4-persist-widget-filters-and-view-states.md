# Story 3.4: Persist Widget Filters and View States

Status: review

## Story

**As a user,**
I want my widget filter selections (e.g., which Kanban column to show, which Linear project) to persist between sessions,
So that I don't have to reconfigure the dashboard every time I open the app.

## Acceptance Criteria

1. **Given** I configure a KanbanColumnWidget to show a specific project and column, **When** I save the configuration, **Then** the `projectId` and `columnId` are stored in `dashboard_widgets.config` (JSONB), **And** on next session the widget renders with the same project/column pre-selected.

2. **Given** I reopen the app after a previous session, **When** the home dashboard loads, **Then** all widgets render with the last-used configuration without requiring re-setup.

3. **Given** a saved widget references a project or column that has since been deleted, **When** the widget renders, **Then** the widget shows an empty state with a "Riconfigura widget" CTA instead of an error.

## Implementation Status Assessment

**AC 1 and AC 2 are already fully implemented.** The `dashboard_widgets.config` JSONB column persists widget configuration across sessions via `useUpdateWidgetConfig()` in `src/hooks/useDashboardWidgets.ts`. The `ConfigureWidgetModal` in `src/components/home/AddWidgetModal.tsx` saves `{ projectId, columnId }` or `{ goalId }` correctly.

**AC 3 is the only gap.** Both `KanbanColumnWidget` and `FinancialGoalWidget` fail silently when their saved config references deleted entities — they show empty/placeholder content rather than a clear "Reconfigure" prompt.

## Tasks / Subtasks

### Task 1: Add stale-config detection to KanbanColumnWidget ✅

**File:** `src/components/home/KanbanColumnWidget.tsx`

**Subtask 1.1 — Import `AlertCircle` from lucide-react** ✅
Add `AlertCircle` to the existing import from `'lucide-react'` alongside `Settings`.

**Subtask 1.2 — Add `isLoading` from `useProjects`** ✅
The `useProjects()` call currently destructures only `data`. Add `isLoading: projectsLoading` from it as well, so we can distinguish "data not yet fetched" from "entity deleted".

**Subtask 1.3 — Derive `isStaleConfig` boolean** ✅
After the existing `project` and `column` lookups, derive:
```typescript
const isStaleConfig =
  isConfigured &&
  !projectsLoading &&
  !isLoading && // tasks loading already destructured
  projects.length > 0 && // guard: projects have actually loaded (not empty list due to loading)
  (!project || !column)
```

The `projects.length > 0` guard prevents a false positive when the user has no projects at all — in that case the empty projects array is a valid data state and `isConfigured` would be false anyway (since there would be no saved projectId). More precisely, this guard ensures we only flag stale config after data has been fetched and returned at least some content, reducing the risk of flashing an error during the hydration window.

**Subtask 1.4 — Render stale-config empty state** ✅
Immediately after the `if (!isConfigured)` early return, add:
```tsx
if (isStaleConfig) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-5 min-h-[200px] text-center">
      <AlertCircle size={20} className="text-gray-600" />
      <p className="text-xs text-gray-500">Progetto o colonna non trovati</p>
      <p className="text-xs text-gray-600">Riconfigura il widget dall&apos;icona ⚙</p>
    </div>
  )
}
```

### Task 2: Add stale-config detection to FinancialGoalWidget ✅

**File:** `src/components/home/FinancialGoalWidget.tsx`

**Current behavior:** When `goalId` points to a deleted goal, `goal` is `undefined` and the widget already renders:
```tsx
<p className="text-xs text-gray-600">Obiettivo non trovato o eliminato</p>
```
This is a partial implementation — it shows a message but **no CTA** to reconfigure.

**Subtask 2.1 — Import `AlertCircle` from lucide-react** ✅
Add `AlertCircle` to the existing import from `'lucide-react'` alongside `Target`, `RefreshCw`, `Pencil`.

**Subtask 2.2 — Replace the silent "not found" message with a full stale-config empty state** ✅
Locate the `!goal` branch in the JSX (line 45–46 in the current file):
```tsx
) : !goal ? (
  <p className="text-xs text-gray-600">Obiettivo non trovato o eliminato</p>
```
Replace it with:
```tsx
) : !goal ? (
  <div className="flex flex-col items-center justify-center gap-2 min-h-[120px] text-center">
    <AlertCircle size={20} className="text-gray-600" />
    <p className="text-xs text-gray-500">Obiettivo non trovato o eliminato</p>
    <p className="text-xs text-gray-600">Riconfigura il widget dall&apos;icona ⚙</p>
  </div>
```

Note: `FinancialGoalWidget` already guards against loading with the `isLoading` check before the `!goal` branch, so no additional loading guard is needed here.

## Dev Notes

### Why AC 1 & 2 are already done

The persistence mechanism works end-to-end:

1. **Storage:** `dashboard_widgets.config` is a JSONB column. `useUpdateWidgetConfig()` calls `supabase.from('dashboard_widgets').update({ config }).eq('id', id)` — individual `update()`, never `upsert()`, preserving all other row fields.

2. **Read on mount:** `useDashboardWidgets()` fetches `config` along with all widget rows on page load. React Query caches the result. Each widget component receives its `config` prop directly from the cached data.

3. **ConfigureWidgetModal** in `AddWidgetModal.tsx` initializes its pickers from `widget.config.projectId`, `widget.config.columnId`, and `widget.config.goalId` respectively, so the UI reflects the last saved values.

No changes are needed to any of these files.

### The stale-config gap (AC 3)

The core issue in `KanbanColumnWidget`:

- `isConfigured` is `true` (both `projectId` and `columnId` are non-empty strings from DB)
- But after React Query fetches projects and columns, `project = undefined` and `column = undefined` because those IDs no longer exist in Linear
- The widget renders the header with `'—'` placeholders and an empty task list
- The user has no indication they need to reconfigure, and the ⚙ icon in the `WidgetShell` action bar (which triggers `ConfigureWidgetModal`) is not prominently discoverable

The fix makes the stale state explicit with a message and a visual pointer to the configure action.

### Loading state guard — critical detail

Do not render the stale-config state while data is still loading. The sequence is:

1. Page mounts → `useProjects()` and `useTasks()` queries fire
2. During loading: `projects = []`, `columns = []` (default values)
3. If we check `!project || !column` during loading, `isStaleConfig` would be `true` even for a valid config
4. Solution: gate on `!projectsLoading && !isLoading && projects.length > 0`

The `projects.length > 0` condition is safe because:
- If `isConfigured` is `true`, there must have been at least one project when the widget was configured
- After loading completes, if `projects` is still empty it means the user's Linear account has no projects — but `isConfigured` would not be `true` in practice for a fresh install
- This guard is a belt-and-suspenders safety measure against the loading flash

### FinancialGoalWidget — simpler case

`FinancialGoalWidget` already has a correct loading guard (`isLoading ? <skeleton> : !goal ? <message>`) so the stale detection is naturally handled by the existing conditional. The only change needed is to replace the bare text message with a full empty-state block that includes the reconfigure hint — matching the visual pattern used in `KanbanColumnWidget`.

### Pattern: "Riconfigura" CTA message

The CTA does not render a button — it directs the user to the `⚙` icon in the `WidgetShell` action bar (always visible on mobile, visible on hover on desktop). This is consistent with the existing "Configura il widget" state in `KanbanColumnWidget` for unconfigured widgets. No new interactive element is needed.

### No DB migration required

The `dashboard_widgets.config` JSONB column already exists and is already used for persistence. No schema changes.

### No changes to hooks or modals

- `useDashboardWidgets.ts` — already correct
- `AddWidgetModal.tsx` / `ConfigureWidgetModal` — already correct
- `useProjects`, `useColumns`, `useTasks` — no changes needed

### Project Structure Notes

```
src/
├── components/
│   └── home/
│       ├── KanbanColumnWidget.tsx      ← MODIFY (Task 1)
│       ├── FinancialGoalWidget.tsx     ← MODIFY (Task 2)
│       └── AddWidgetModal.tsx          ← DO NOT MODIFY (already correct)
├── hooks/
│   └── useDashboardWidgets.ts          ← DO NOT MODIFY (already correct)
```

### References

- `src/components/home/KanbanColumnWidget.tsx` — full current implementation (79 lines)
- `src/components/home/FinancialGoalWidget.tsx` — full current implementation (108 lines); `!goal` branch at line 45
- `src/components/home/AddWidgetModal.tsx` — `ConfigureWidgetModal` at line 244; `KanbanPickers` at line 79
- `src/hooks/useDashboardWidgets.ts` — `useUpdateWidgetConfig` at line 101; `WidgetConfig` interface at line 8

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- No test framework found (no jest/vitest/playwright config). TypeScript errors in the project are pre-existing environment issues (missing node_modules — `react`, `lucide-react`, `next/link` types not installed in sandbox). No new errors introduced by this story.

### Completion Notes List
- ✅ Task 1 complete: KanbanColumnWidget now detects stale config (deleted project/column) and shows an explicit empty state with reconfigure hint. Loading guard prevents false positives during React Query hydration.
- ✅ Task 2 complete: FinancialGoalWidget upgraded from bare text message to full empty-state block matching KanbanColumnWidget pattern.
- AC 1 & AC 2 confirmed already implemented via existing `dashboard_widgets.config` JSONB persistence. No schema changes needed.
- AC 3 implemented in both widgets. Pattern is consistent: AlertCircle icon + message + reconfigure hint pointing to ⚙ icon.

### Change Log
- 2026-03-22: Implemented AC 3 — stale-config detection in KanbanColumnWidget and FinancialGoalWidget. Added AlertCircle empty states with reconfigure CTA.

### File List
- `src/components/home/KanbanColumnWidget.tsx`
- `src/components/home/FinancialGoalWidget.tsx`
