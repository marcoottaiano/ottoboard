# Story 3.1: Widget Empty States with Contextual CTAs

Status: review

## Story

As a user,
I want every home widget in an empty or error state to show a contextual call-to-action,
so that I always know what to do next and never see a blank or broken widget.

## Acceptance Criteria

1. **Given** the KanbanColumnWidget has no tasks in the selected column, **When** the widget renders, **Then** an empty state is shown with: a purple-tinted module icon, the message "Nessun task in questa colonna", and an "Apri Progetti →" link navigating to `/projects`.
2. **Given** the LastActivityCard has no Strava activities synced, **When** the widget renders, **Then** an empty state is shown with: an orange-tinted module icon, the message "Nessun allenamento sincronizzato", and a "Connetti Strava →" link navigating to `/profile`.
3. **Given** the MonthFinanceWidget has no transactions for the current month, **When** the widget renders, **Then** an empty state is shown with: an emerald-tinted module icon, the message "Nessun movimento questo mese", and an "Aggiungi transazione →" link navigating to `/finance`.
4. **Given** any widget is in a loading state, **When** data is being fetched, **Then** a skeleton loader using `animate-pulse` and `bg-white/5` is shown instead of a spinner or blank space. *(Already implemented in all widgets — verified, no code changes required.)*

## Tasks / Subtasks

- [x] **Task 1 — LastActivityCard empty state** (`src/components/fitness/LastActivityCard.tsx`)
  - [x] Add `Activity` (or `Dumbbell`) and `Link` imports from `lucide-react` and `next/link`
  - [x] Replace the plain text empty `<div>` at lines 72–76 with the standardised empty state layout (icon + message + CTA link to `/profile`)
  - [x] Preserve the `bare` prop logic: when `bare=true` omit the outer card wrapper classes; when `bare=false` keep `rounded-xl bg-white/5 border border-white/10`
  - [x] CTA link text: "Connetti Strava →", colour: `text-orange-500/70 hover:text-orange-400`

- [x] **Task 2 — KanbanColumnWidget empty state** (`src/components/home/KanbanColumnWidget.tsx`)
  - [x] Add `LayoutGrid` (or `Kanban`) import from `lucide-react` and `Link` from `next/link`
  - [x] Replace the plain `<p>` at line 74 with the standardised empty state layout (icon + message + CTA link to `/projects`)
  - [x] CTA link text: "Apri Progetti →", colour: `text-purple-500/70 hover:text-purple-400`
  - [x] Keep the existing `isLoading` skeleton branch untouched above this block

- [x] **Task 3 — MonthFinanceWidget empty state** (`src/components/home/MonthFinanceWidget.tsx`)
  - [x] Add `Wallet` (or `Receipt`) import from `lucide-react` and `Link` from `next/link`
  - [x] The current code already shows `"Nessuna transazione questo mese"` as plain text when `top3.length === 0` (line 135). Replace that plain `<p>` with the standardised empty state layout
  - [x] **Important:** the empty state should trigger when `transactions.length === 0` (no transactions at all this month), not only when there are no expense categories. Both conditions coincide in practice, but check against `transactions.length === 0` for clarity; the top-3 section empty state covers the residual case (income-only month)
  - [x] CTA link text: "Aggiungi transazione →", colour: `text-emerald-500/70 hover:text-emerald-400`
  - [x] Keep the balance header section visible even when there are no transactions (balance will be `€ 0,00`)

- [x] **Task 4 — Verify skeleton loaders (no code changes)**
  - [x] Confirm `LastActivityCard` has `SkeletonCard` with `animate-pulse` ✅
  - [x] Confirm `KanbanColumnWidget` has `animate-pulse` skeleton in `isLoading` branch ✅
  - [x] Confirm `MonthFinanceWidget` has `animate-pulse` skeleton in `isLoading || loadingStats` branch ✅
  - [x] Confirm `HabitsWidget` and `RemindersWidget` are untouched ✅

## Dev Notes

### Empty State Anatomy — Required Pattern

All three empty states must follow this exact layout:

```tsx
<div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-5">
  <IconName size={24} className="text-gray-700" />
  <p className="text-xs text-gray-500">Message text</p>
  <Link
    href="/target-route"
    className="text-xs text-{module-color}/70 hover:text-{module-color} transition-colors"
  >
    CTA text →
  </Link>
</div>
```

Key rules:
- Icon colour is always `text-gray-700` (muted, not the module accent colour).
- Message colour is always `text-xs text-gray-500`.
- CTA uses the module accent colour at 70% opacity for the default state, full opacity on hover.
- `Link` is `next/link` for internal navigation (client-side routing, no full reload).

### Module Colour Map

| Module   | Accent class (CTA link)                              | Suggested icon     |
|----------|------------------------------------------------------|--------------------|
| Fitness  | `text-orange-500/70 hover:text-orange-400`           | `Activity`         |
| Finance  | `text-emerald-500/70 hover:text-emerald-400`         | `Wallet`           |
| Projects | `text-purple-500/70 hover:text-purple-400`           | `LayoutGrid`       |

### LastActivityCard — Implementation Detail

Current empty state code to replace (lines 72–76):

```tsx
if (!activity) {
  const emptyClass = bare
    ? 'p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-500 h-full min-h-[160px]'
  return <div className={emptyClass}>Nessuna attività trovata</div>
}
```

Replace with:

```tsx
if (!activity) {
  const emptyClass = bare
    ? 'p-5 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[160px]'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col items-center justify-center gap-2 text-center h-full min-h-[160px]'
  return (
    <div className={emptyClass}>
      <Activity size={24} className="text-gray-700" />
      <p className="text-xs text-gray-500">Nessun allenamento sincronizzato</p>
      <Link
        href="/profile"
        className="text-xs text-orange-500/70 hover:text-orange-400 transition-colors"
      >
        Connetti Strava →
      </Link>
    </div>
  )
}
```

Add to imports: `Activity` from `lucide-react`, `Link` from `next/link`.

### KanbanColumnWidget — Implementation Detail

Current empty state code to replace (line 73–75):

```tsx
) : (
  <p className="text-sm text-gray-600 text-center py-4">Nessuna task in questa colonna</p>
)}
```

Replace with:

```tsx
) : (
  <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-5">
    <LayoutGrid size={24} className="text-gray-700" />
    <p className="text-xs text-gray-500">Nessun task in questa colonna</p>
    <Link
      href="/projects"
      className="text-xs text-purple-500/70 hover:text-purple-400 transition-colors"
    >
      Apri Progetti →
    </Link>
  </div>
)}
```

Add to imports: `LayoutGrid` from `lucide-react`, `Link` from `next/link`.

### MonthFinanceWidget — Implementation Detail

The widget currently has two related code sections:

1. **Top-3 categories empty branch** (lines 134–136) — currently shows plain text when `top3.length === 0`:
   ```tsx
   ) : (
     <p className="text-sm text-gray-600 text-center py-4">Nessuna transazione questo mese</p>
   )}
   ```

2. The widget does NOT have an explicit guard for `transactions.length === 0` that hides the balance header.

**Recommended approach:** Keep the balance header visible at all times (it will display `€ 0,00` when empty, which is correct). Replace only the top-3 empty branch text with the standardised CTA layout:

```tsx
) : (
  <div className="flex flex-col items-center justify-center gap-2 text-center py-6 px-5">
    <Wallet size={24} className="text-gray-700" />
    <p className="text-xs text-gray-500">Nessun movimento questo mese</p>
    <Link
      href="/finance"
      className="text-xs text-emerald-500/70 hover:text-emerald-400 transition-colors"
    >
      Aggiungi transazione →
    </Link>
  </div>
)}
```

Add to imports: `Wallet` from `lucide-react`, `Link` from `next/link`.

Note: `TrendingDown` and `TrendingUp` are already imported in this file; no conflict.

### Skeleton Loaders — Verified, No Changes Required

AC 4 is already satisfied by existing implementations:

- `LastActivityCard`: `SkeletonCard` component (lines 42–62) uses `animate-pulse` with `bg-white/10` shimmer blocks.
- `KanbanColumnWidget`: inline skeleton (lines 54–59) uses `animate-pulse` with `bg-white/5 rounded-lg` blocks.
- `MonthFinanceWidget`: inline skeleton (lines 57–70) uses `animate-pulse` with `bg-white/10` and `bg-white/5` blocks.
- `HabitsWidget`: has skeleton — do not modify.
- `RemindersWidget`: has `animate-pulse` skeleton — do not modify.

### Widgets to Leave Untouched

- `HabitsWidget` — already has correct empty state with teal CTA link to `/habits`.
- `RemindersWidget` — already has correct empty state with "+ Aggiungi" button.
- `WidgetShell` — do not modify the drag handle, configure, or remove actions.

### Design System Reference

- Card backgrounds: `bg-white/[0.03–0.05]` + `border border-white/[0.06–0.10]`
- Rounded corners: `rounded-xl` for widget cards, `rounded-lg` for sub-elements
- All icon imports from `lucide-react`
- All internal navigation via `next/link` `<Link>` (not `<a href>`)
- Dark mode is always active (no light mode variant needed)

### Project Structure Notes

Files to modify — all are small, focused components:

| File | Location | Lines affected |
|------|----------|----------------|
| `LastActivityCard.tsx` | `src/components/fitness/` | ~72–76 (empty state block) |
| `KanbanColumnWidget.tsx` | `src/components/home/` | ~73–75 (empty tasks branch) |
| `MonthFinanceWidget.tsx` | `src/components/home/` | ~134–136 (top-3 empty branch) |

No new files need to be created. No hooks, no DB schema changes, no API routes.

### References

- `src/components/fitness/LastActivityCard.tsx` — current empty state at lines 72–76; `SkeletonCard` at lines 42–62; `bare` prop pattern at lines 81–83
- `src/components/home/KanbanColumnWidget.tsx` — current task-list empty branch at line 74; skeleton at lines 54–59; configured guard at lines 26–34
- `src/components/home/MonthFinanceWidget.tsx` — current top-3 empty branch at lines 134–136; skeleton at lines 57–70; balance section at lines 80–111
- `src/components/home/HabitsWidget.tsx` — reference implementation of the correct empty state pattern (do not modify)
- `src/components/home/RemindersWidget.tsx` — reference for correct empty state (do not modify)
- `CLAUDE.md` — design system, module colours, tech stack, component conventions

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- Implemented standardized empty state for LastActivityCard with Activity icon and CTA to /profile.
- Implemented standardized empty state for KanbanColumnWidget with LayoutGrid icon and CTA to /projects.
- Implemented standardized empty state for MonthFinanceWidget with Wallet icon and CTA to /finance.
- Verified all skeleton loaders are already compliant.

### File List
- `src/components/fitness/LastActivityCard.tsx`
- `src/components/home/KanbanColumnWidget.tsx`
- `src/components/home/MonthFinanceWidget.tsx`
