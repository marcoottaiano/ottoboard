# Story 3.3: Dashboard Widget Customization (Add / Remove / Reorder)

Status: review

## Story

**As a user,**
I want to add, remove, and reorder widgets on my home dashboard,
so that I can configure the morning loop to show only the information relevant to me.

## Acceptance Criteria

1. **Given** I am on the home dashboard, **When** I click "Aggiungi widget", **Then** the AddWidgetModal opens showing all available widget types **not already on the dashboard** (singleton types only; `kanban-column` and `financial-goal` may be added multiple times).
2. **Given** I select a widget type in the AddWidgetModal, **When** I confirm, **Then** the widget is appended to the dashboard and saved to `dashboard_widgets` with `position = maxPosition + 1`.
3. **Given** I hover over (desktop) or view (mobile) a widget's WidgetShell action bar, **When** I click the remove icon, **Then** an inline confirm appears ("Rimuovere?" → "Sì" / "No"), **And** on confirm the widget is removed from the dashboard and deleted from `dashboard_widgets`.
4. **Given** I drag a widget by its handle to a new position, **When** I drop it, **Then** the new order is saved to `dashboard_widgets.position` and persists across sessions.

## Implementation Status

**This story is largely already implemented.** The primary gap was **AC #1**, which has now been addressed by adding `existingTypes` filtering to `AddWidgetModal`.

### Already Implemented

| Feature | Files | Status |
|---|---|---|
| DnD reorder (dnd-kit) with optimistic update | `src/app/page.tsx` | ✅ Complete |
| TouchSensor with `{ delay: 250, tolerance: 8 }` | `src/app/page.tsx` | ✅ Complete |
| PointerSensor with `{ distance: 8 }` | `src/app/page.tsx` | ✅ Complete |
| `handleDragEnd` with arrayMove + optimistic update | `src/app/page.tsx` | ✅ Complete |
| `AddWidgetModal` + `ConfigureWidgetModal` | `src/components/home/AddWidgetModal.tsx` | ✅ Complete |
| "Aggiungi widget" dashed tile button | `src/app/page.tsx` | ✅ Complete |
| Empty state with "Ripristina predefiniti" | `src/app/page.tsx` | ✅ Complete |
| `useAddWidget()` — insert at maxPos + 1 | `src/hooks/useDashboardWidgets.ts` | ✅ Complete |
| `useRemoveWidget()` — delete by id | `src/hooks/useDashboardWidgets.ts` | ✅ Complete |
| `useReorderWidgets()` — individual UPDATE per row | `src/hooks/useDashboardWidgets.ts` | ✅ Complete |
| `useUpdateWidgetConfig()` | `src/hooks/useDashboardWidgets.ts` | ✅ Complete |
| `useSeedDefaultWidgets()` | `src/hooks/useDashboardWidgets.ts` | ✅ Complete |
| WidgetShell: drag handle, inline remove confirm, configure button | `src/components/home/WidgetShell.tsx` | ✅ Complete |
| Action bar: always-visible mobile, hover-only desktop | `src/components/home/WidgetShell.tsx` | ✅ Complete |

## Tasks / Subtasks

### Task 1 — Fix AddWidgetModal: filter singleton types already on dashboard (AC #1)

**File:** `src/components/home/AddWidgetModal.tsx`

**Singleton widget types** (can only appear once on the dashboard):
```
'last-activity' | 'week-stats' | 'month-finance' | 'total-balance' | 'reminders' | 'habits'
```

**Multi-instance widget types** (can appear multiple times):
```
'kanban-column' | 'financial-goal'
```

**What to do:**

1. Add a new prop to `AddWidgetModal`:
   ```typescript
   interface AddWidgetModalProps {
     onClose: () => void
     existingTypes: WidgetType[]  // types already on the dashboard
   }
   ```

2. Inside the component, compute the visible catalogue by filtering out singleton types that already exist:
   ```typescript
   const SINGLETON_TYPES: WidgetType[] = [
     'last-activity', 'week-stats', 'month-finance',
     'total-balance', 'reminders', 'habits',
   ]

   const visibleCatalogue = WIDGET_CATALOGUE.filter((w) => {
     if (SINGLETON_TYPES.includes(w.type)) {
       return !existingTypes.includes(w.type)
     }
     return true // kanban-column and financial-goal always visible
   })
   ```

3. Render `visibleCatalogue` instead of `WIDGET_CATALOGUE` in the grid.

4. If `visibleCatalogue` is empty, show a message:
   ```tsx
   {visibleCatalogue.length === 0 && (
     <p className="text-xs text-gray-600 text-center py-4">
       Tutti i widget sono già presenti nella dashboard.
     </p>
   )}
   ```

5. Update the call site in `src/app/page.tsx` to pass the new prop:
   ```tsx
   {showAdd && (
     <AddWidgetModal
       onClose={() => setShowAdd(false)}
       existingTypes={widgets.map((w) => w.type)}
     />
   )}
   ```

### Task 2 — Manual verification checklist

After the fix, verify the following flows work end-to-end:

- [x] Open AddWidgetModal — singleton types already on dashboard do not appear in the grid
- [x] Add a widget — it appears at the end of the dashboard grid
- [x] `kanban-column` and `financial-goal` remain visible in the modal even if already added once
- [x] Remove a widget — inline confirm appears; "Sì" deletes; "No" cancels
- [x] Drag widget to a new position — new order persists after page reload
- [x] Empty dashboard — "Ripristina predefiniti" seeds 3 default widgets
- [x] Mobile: action bar is always visible (not hover-dependent)
- [x] Desktop: action bar appears on hover only

## Dev Notes

### Key Pattern: Reorder uses individual UPDATE (not upsert)

`useReorderWidgets` in `src/hooks/useDashboardWidgets.ts` uses individual UPDATE calls per widget, not batch upsert. This is intentional: upsert with partial fields would overwrite unspecified columns with NULL in Supabase.

```typescript
await Promise.all(
  orderedIds.map((id, i) =>
    supabase.from('dashboard_widgets').update({ position: i }).eq('id', id)
  )
)
```

Do **not** change this to upsert.

### Key Pattern: Optimistic update for reorder

```typescript
// In src/app/page.tsx — handleDragEnd
queryClient.setQueryData(
  ['dashboard-widgets'],
  reordered.map((w, i) => ({ ...w, position: i }))
)
reorderWidgets.mutate(reordered.map((w) => w.id))
```

The UI updates immediately before the Supabase call completes. If the mutation fails, React Query's `onError` rollback via cache invalidation corrects the state on the next fetch.

### Key Pattern: DnD sensors (mobile + desktop)

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
)
```

`distance: 8` prevents accidental drag on click. `delay: 250, tolerance: 8` gives mobile users a deliberate touch gesture before drag starts.

### Key Pattern: WidgetShell action bar visibility

```tsx
// Always visible on mobile, hover-only on md+
<div className="... opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
```

Requires `group` class on the outer container of `WidgetShell`.

### CSS Note: overflow-hidden breaks Select dropdowns

`WidgetShell` intentionally does **not** use `overflow-hidden` on its container. The widget content area uses `flex-1 min-h-0` without overflow clipping so that `Select` dropdown menus (e.g., inside `KanbanColumnWidget`) can escape the widget boundary visually. Do not add `overflow-hidden` to `WidgetShell`.

### Database Schema

```sql
-- dashboard_widgets (already exists, no migration needed)
id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id   UUID NOT NULL DEFAULT auth.uid()
type      TEXT NOT NULL
-- Valid values: 'last-activity' | 'week-stats' | 'month-finance' |
--               'total-balance' | 'kanban-column' | 'reminders' |
--               'habits' | 'financial-goal'
position  INT NOT NULL    -- ordering (0-based)
config    JSONB           -- { projectId, columnId } for kanban-column
                          -- { goalId } for financial-goal
                          -- {} for all other types
```

RLS is already applied. No migration is required for this story.

### Project Structure Notes

```
src/
├── app/
│   └── page.tsx                         # Home page — DnD context, widget grid, AddWidgetModal call site
├── components/home/
│   ├── AddWidgetModal.tsx               # GAP HERE: needs existingTypes prop + singleton filtering
│   ├── WidgetShell.tsx                  # Drag handle, inline remove confirm, configure button
│   ├── MonthFinanceWidget.tsx
│   ├── KanbanColumnWidget.tsx
│   ├── TotalBalanceWidget.tsx
│   ├── RemindersWidget.tsx
│   ├── HabitsWidget.tsx
│   └── FinancialGoalWidget.tsx
├── components/fitness/
│   ├── LastActivityCard.tsx             # Supports bare prop
│   └── WeekStatsCard.tsx                # Supports bare prop
└── hooks/
    └── useDashboardWidgets.ts           # All widget CRUD mutations
```

### References

- `src/app/page.tsx` — full DnD implementation, optimistic update, sensor configuration
- `src/components/home/AddWidgetModal.tsx` — widget catalogue, add flow, configure flow
- `src/components/home/WidgetShell.tsx` — drag handle, inline confirm, action bar
- `src/hooks/useDashboardWidgets.ts` — all React Query mutations for widget CRUD

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
- `src/components/home/AddWidgetModal.tsx` — add `existingTypes` prop, filter singleton types, show empty-catalogue message
- `src/app/page.tsx` — pass `existingTypes={widgets.map((w) => w.type)}` to `AddWidgetModal`
