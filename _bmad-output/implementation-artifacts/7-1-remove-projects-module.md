# Story 7.1: Remove Projects Module

Status: review

## Story

As a developer maintaining Ottoboard,
I want to remove the entire Projects module from the codebase,
So that the app is leaner, has no broken routes, and no dead code referencing Linear.

## Acceptance Criteria

1. **Given** the app is running **When** navigating to `/projects` **Then** the route does not exist (redirect to home or 404) **And** sidebar/bottom nav has no "Progetti" entry.
2. **Given** the home dashboard widget list **When** a user tries to add a widget **Then** `kanban-column` type is NOT offered **And** any existing `kanban-column` widgets in `dashboard_widgets` are cleaned up via migration.
3. **Given** the database **When** the cleanup migration runs **Then** tables `projects`, `columns`, `tasks` are dropped **And** all Linear-specific columns are gone **And** `linear_tokens` rows are deleted.
4. **Given** the Profile page **When** the user visits `/profile` **Then** no Linear integration card is visible **And** no Linear API key field or team selector exists.
5. **Given** the Onboarding wizard **When** a new user goes through onboarding **Then** no Linear setup step is present.

## Tasks / Subtasks

- [x] Task 1 — Database migration (AC: 2, 3)
  - [x] Create new migration file `supabase/migrations/<timestamp>_remove_projects_and_linear.sql`
  - [x] DROP TABLE IF EXISTS tasks CASCADE
  - [x] DROP TABLE IF EXISTS columns CASCADE
  - [x] DROP TABLE IF EXISTS projects CASCADE
  - [x] DELETE FROM dashboard_widgets WHERE type = 'kanban-column'
  - [x] DELETE FROM linear_tokens (table was linear_tokens, not user_integrations)
  - [x] Execute migration on Supabase

- [x] Task 2 — Delete entire folders/files (AC: 1, 4)
  - [x] Delete `src/app/projects/` (entire folder including page.tsx)
  - [x] Delete `src/components/projects/` (entire folder, 12 files)
  - [x] Delete `src/lib/linear/` (entire folder: client.ts, crypto.ts, queries.ts, transforms.ts, types.ts)
  - [x] Delete `src/app/api/linear/` (entire folder: 12 route files)
  - [x] Delete `src/components/home/KanbanColumnWidget.tsx`
  - [x] Delete `src/components/profile/LinearIntegrationCard.tsx`
  - [x] Delete hooks: `useProjects.ts`, `useProjectMutations.ts`, `useColumns.ts`, `useColumnMutations.ts`, `useTasks.ts`, `useTaskMutations.ts`, `useProjectStore.ts`, `useLinearConnection.ts`, `useLinearIssueUpdate.ts`

- [x] Task 3 — Edit `src/components/ui/Sidebar.tsx` (AC: 1)
  - [x] Remove NAV_ITEMS entry: `{ href: '/projects', label: 'Progetti', icon: 'Kanban', module: 'projects' }`
  - [x] Remove branch `if (pathname.startsWith("/projects")) return "projects"` from `getActiveModule()`

- [x] Task 4 — Edit `src/app/page.tsx` (home) (AC: 2)
  - [x] Remove import of `KanbanColumnWidget`
  - [x] Remove import of `NotificationPermissionBanner` (if present — done in Story 7.2 otherwise)
  - [x] Remove `case 'kanban-column'` from widget renderer switch
  - [x] Remove `if (type === 'kanban-column') return '/projects'` from `getWidgetHref`
  - [x] Remove condition `w.type === 'kanban-column'` from configurable widget filtering

- [x] Task 5 — Edit `src/components/home/AddWidgetModal.tsx` (AC: 2)
  - [x] Remove imports: `useProjects`, `useColumns`
  - [x] Remove `kanban-column` from `WIDGET_CATALOGUE`
  - [x] Delete `KanbanPickers` internal component
  - [x] Remove kanban-column validation condition
  - [x] Remove kanban-column config from `handleAdd`
  - [x] Remove KanbanPickers rendering section

- [x] Task 6 — Edit `src/hooks/useDashboardWidgets.ts` (AC: 2)
  - [x] Remove `'kanban-column'` from `WidgetType` union
  - [x] Remove `projectId?: string` and `columnId?: string` from `WidgetConfig` interface

- [x] Task 7 — Edit `src/types/index.ts` (AC: 3)
  - [x] Remove: `ProjectStatus`, `TaskPriority`, `Project`, `Column`, `Task` interfaces
  - [x] Remove `'projects'` from `Module` union type

- [x] Task 8 — Edit `src/app/profile/page.tsx` (AC: 4)
  - [x] Remove import of `LinearIntegrationCard`
  - [x] Remove `<LinearIntegrationCard />` from JSX

- [x] Task 9 — Edit `src/components/profile/IntegrationHealthSection.tsx` (AC: 4)
  - [x] Remove import of `useLinearConnection`
  - [x] Remove `ServiceHealthCard` section for Linear
  - [x] Remove any `isLinearConnected` logic

- [x] Task 10 — Edit `src/app/onboarding/page.tsx` (AC: 5)
  - [x] Remove state for Linear API key and teams
  - [x] Remove useEffect for Linear key validation (debounce)
  - [x] Remove `handleSaveLinear` and `handleCompleteLinear` functions
  - [x] Remove Step 3 — Linear section from JSX (all Linear inputs, team selector, error handling)

- [x] Task 11 — Edit `src/app/api/integration-health/route.ts`
  - [x] Remove any query on `integration_error_logs` for `service = 'linear'`
  - [x] Remove Linear section from response JSON
  - [x] Keep Strava section untouched

- [x] Task 12 — Build verification
  - [x] Run `npm run build` and resolve all TypeScript errors from removed imports
  - [x] Verify no remaining references to `linear`, `projects`, `kanban-column` in src/

## Dev Notes

### What to KEEP (Critical — do not touch)
- `src/lib/strava/` — Strava client stays intact
- `src/app/api/strava/` — Strava routes stay intact
- `src/components/home/RemindersWidget.tsx` — unrelated to projects
- `src/hooks/useDashboardWidgets.ts` — keep the file, only remove kanban-column type
- `src/app/api/integration-health/route.ts` — keep the file, only remove Linear section
- All finance, fitness, habits, home modules — completely unrelated

### Database Migration Pattern
Follow existing migrations in `supabase/migrations/`. Format: `YYYYMMDDHHMMSS_description.sql`. Use `IF EXISTS` on all DROP statements to be idempotent:

```sql
-- Remove kanban-column widgets
DELETE FROM dashboard_widgets WHERE type = 'kanban-column';
-- Remove Linear integrations
DELETE FROM linear_tokens;
-- Drop project tables (tasks first due to FK)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
```

### Import Cleanup Strategy
After deleting files, run `npm run build` — TypeScript will enumerate every broken import. Fix them one by one. DO NOT do a global search-replace without reading the file first.

### Sidebar NAV_ITEMS location
Check `src/components/ui/Sidebar.tsx` for the `NAV_ITEMS` array. It contains objects like:
```typescript
{ href: '/projects', label: 'Progetti', icon: Kanban, module: 'projects' }
```
Remove the entire object. The sidebar also renders a bottom nav on mobile — same array drives both.

### useDashboardWidgets WidgetType
In `src/hooks/useDashboardWidgets.ts`, `WidgetType` is a union type:
```typescript
export type WidgetType = 'last-activity' | 'week-stats' | 'month-finance' | 'total-balance' | 'kanban-column' | 'reminders'
```
Remove `'kanban-column'` only. Keep `'reminders'` and all others.

### Project Structure Notes
- Migration files live in `supabase/migrations/` — use Supabase CLI or run directly on dashboard
- Components follow feature-folder pattern under `src/components/<module>/`
- Hooks are flat in `src/hooks/`
- API routes follow Next.js App Router pattern: `src/app/api/<resource>/route.ts`

### References
- Epic 7 story spec: `_bmad-output/planning_artifacts/epics.md` — Story 7.1
- CLAUDE.md — Modulo 3 (Progetti schema) and Fase 10 (Linear integration architecture)
- Existing migration pattern: `supabase/migrations/20260320*.sql`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- DB migration: `user_integrations` table doesn't exist — actual table is `linear_tokens`. Migration updated accordingly.
- Code review (3-layer parallel): 5 bugs found and fixed post-review.

### Completion Notes List

- Task 1: Created `supabase/migrations/20260325000000_remove_projects_and_linear.sql` and applied via Supabase MCP. Dropped tasks, columns, projects tables and linear_tokens table. Deleted kanban-column dashboard widgets.
- Task 2: Deleted 4 folders (src/app/projects, src/components/projects, src/lib/linear, src/app/api/linear) and 11 individual files (KanbanColumnWidget, LinearIntegrationCard, 9 hooks).
- Task 3: Sidebar — removed Kanban NAV_ITEM and `/projects` branch from getActiveModule().
- Task 4: page.tsx — removed KanbanColumnWidget import, kanban-column switch case, getWidgetHref condition, configurable condition.
- Task 5: AddWidgetModal — rewrote file, removed KanbanPickers component, removed kanban-column from WIDGET_CATALOGUE and all related state/logic.
- Task 6: useDashboardWidgets — removed 'kanban-column' from WidgetType union, removed projectId/columnId from WidgetConfig.
- Task 7: types/index.ts — removed ProjectStatus, TaskPriority, Project, Column, Task interfaces and 'projects' from Module union.
- Task 8: profile/page.tsx — removed LinearIntegrationCard import and JSX. Grid updated to 2 columns.
- Task 9: IntegrationHealthSection — rewrote to remove Linear card and useLinearConnection hook. Only Strava card remains.
- Task 10: onboarding/page.tsx — rewrote to 2-step flow. Removed all Linear state, effects, and Step 3 JSX.
- Task 11: integration-health route + useIntegrationHealth hook — removed Linear service, now returns only strava errors.
- Task 12: Build passed with 0 errors. No remaining references to linear/projects/kanban-column in src/.

### File List

**Created:**
- `supabase/migrations/20260325000000_remove_projects_and_linear.sql`
- `supabase/migrations/20260325000001_remove_linear_from_error_logs_constraint.sql`

**Deleted:**
- `src/app/projects/page.tsx`
- `src/components/projects/ColorDot.tsx`
- `src/components/projects/DueDateBadge.tsx`
- `src/components/projects/LabelBadge.tsx`
- `src/components/projects/PriorityBadge.tsx`
- `src/components/projects/ProjectFormModal.tsx`
- `src/components/projects/LinearNotConnectedBanner.tsx`
- `src/components/projects/KanbanColumn.tsx`
- `src/components/projects/NewTaskModal.tsx`
- `src/components/projects/ProjectSidebar.tsx`
- `src/components/projects/TaskDetailModal.tsx`
- `src/components/projects/TaskCard.tsx`
- `src/components/projects/KanbanBoard.tsx`
- `src/lib/linear/client.ts`
- `src/lib/linear/crypto.ts`
- `src/lib/linear/queries.ts`
- `src/lib/linear/transforms.ts`
- `src/lib/linear/types.ts`
- `src/app/api/linear/connect/route.ts`
- `src/app/api/linear/create-issue/route.ts`
- `src/app/api/linear/create-project/route.ts`
- `src/app/api/linear/disconnect/route.ts`
- `src/app/api/linear/select-team/route.ts`
- `src/app/api/linear/status/route.ts`
- `src/app/api/linear/teams/route.ts`
- `src/app/api/linear/update-issue/route.ts`
- `src/app/api/linear/sync/route.ts`
- `src/app/api/linear/reconcile/route.ts`
- `src/app/api/linear/webhook/route.ts`
- `src/app/api/linear/validate/route.ts`
- `src/components/home/KanbanColumnWidget.tsx`
- `src/components/profile/LinearIntegrationCard.tsx`
- `src/hooks/useProjects.ts`
- `src/hooks/useProjectMutations.ts`
- `src/hooks/useColumns.ts`
- `src/hooks/useColumnMutations.ts`
- `src/hooks/useTasks.ts`
- `src/hooks/useTaskMutations.ts`
- `src/hooks/useProjectStore.ts`
- `src/hooks/useLinearConnection.ts`
- `src/hooks/useLinearIssueUpdate.ts`

**Modified:**
- `src/components/ui/Sidebar.tsx`
- `src/app/page.tsx`
- `src/components/home/AddWidgetModal.tsx`
- `src/hooks/useDashboardWidgets.ts`
- `src/types/index.ts`
- `src/app/profile/page.tsx`
- `src/components/profile/IntegrationHealthSection.tsx`
- `src/hooks/useIntegrationHealth.ts`
- `src/app/onboarding/page.tsx`
- `src/app/api/integration-health/route.ts`
