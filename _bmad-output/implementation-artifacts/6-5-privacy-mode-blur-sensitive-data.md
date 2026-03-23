# Story 6.5: Privacy Mode — Blur Sensitive Data

Status: review

## Story

As a user,
I want to toggle a Privacy Mode that blurs all sensitive numerical values across the app,
So that I can use the dashboard in public without exposing personal financial or health data.

## Acceptance Criteria

1. **Given** I toggle Privacy Mode on **When** it activates **Then** all sensitive values are immediately blurred without page reload (finance balances, amounts, body metrics, activity stats)

2. **Given** Privacy Mode is active **When** I navigate between pages **Then** blur persists across all modules

3. **Given** I toggle Privacy Mode off **When** it activates **Then** all values are immediately revealed without page reload

4. **Given** I close and reopen the app with Privacy Mode active **When** the app loads **Then** Privacy Mode is restored from `localStorage`

5. **Given** Privacy Mode is active **When** I look at the UI **Then** a visible indicator (icon/badge) shows that Privacy Mode is on

## Tasks / Subtasks

- [x] Create `usePrivacyMode` Zustand store + localStorage sync (AC: #1, #2, #3, #4)
  - [x] Store in `src/hooks/usePrivacyMode.ts` (or `src/store/privacyMode.ts`)
  - [x] State: `{ isPrivate: boolean; toggle: () => void }`
  - [x] Persist to `localStorage` key `'ottoboard-privacy-mode'`
  - [x] Initialize from `localStorage` on store creation
- [x] Create `PrivacyValue` component (AC: #1, #3)
  - [x] `<PrivacyValue>` wraps any sensitive value and applies blur when `isPrivate === true`
  - [x] CSS blur: `filter: blur(8px); user-select: none; pointer-events: none`
  - [x] Transition: `transition-all duration-200`
  - [x] Location: `src/components/ui/PrivacyValue.tsx`
- [x] Add Privacy Mode toggle to UI (AC: #5)
  - [x] Add toggle button in sidebar (desktop) and/or header
  - [x] Icon: `EyeOff` (Lucide) when private, `Eye` when visible
  - [x] Active state: subtle indicator (orange dot or text "Privato")
- [x] Wrap sensitive values across modules (AC: #1)
  - [x] **Finance:** `TotalBalanceWidget`, `MonthlyHeader` (saldo, entrate, uscite), `TransactionList` (amounts), `SpendingPieChart` labels
  - [x] **Fitness:** `WeightChart` Y-axis values, `BodyFatChart` values, `WeekStatsCard` (km, calorie)
  - [x] **Home widgets:** `MonthFinanceWidget`, `TotalBalanceWidget`
  - [x] Do NOT blur: dates, category names, activity types, labels

## Dev Notes

### Zustand Store Pattern

```typescript
// src/hooks/usePrivacyMode.ts
import { create } from 'zustand'

const STORAGE_KEY = 'ottoboard-privacy-mode'

interface PrivacyModeStore {
  isPrivate: boolean
  toggle: () => void
}

export const usePrivacyMode = create<PrivacyModeStore>((set) => ({
  isPrivate: typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY) === 'true'
    : false,
  toggle: () => set((state) => {
    const next = !state.isPrivate
    localStorage.setItem(STORAGE_KEY, String(next))
    return { isPrivate: next }
  }),
}))
```

### PrivacyValue Component

```tsx
// src/components/ui/PrivacyValue.tsx
export function PrivacyValue({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isPrivate } = usePrivacyMode()
  return (
    <span className={cn(
      'transition-all duration-200',
      isPrivate && 'blur-sm select-none pointer-events-none',
      className
    )}>
      {children}
    </span>
  )
}
```

### What to Blur — Explicit List

| Module | Values to blur |
|--------|---------------|
| Finance | Balance amounts, income/expense totals, transaction amounts, budget amounts |
| Fitness | Weight values, body fat %, lean/fat mass kg, pace, distance, calories |
| Home widgets | All numerical values in finance widgets |
| Body tab | All measurements (weight, circumferences, skinfold values) |

**Do NOT blur:** dates, labels, category names, activity types, icons, percentages of completion (habits)

### Architecture Constraints

- Use **Zustand** for the store — already in stack (v4)
- Do NOT use React Context for this — Zustand is the established pattern
- The `zustand/middleware` `persist` middleware is an alternative to manual localStorage — use whichever is already used in the project
- No server-side state needed — pure client-side UI
- The blur CSS approach is preferred over conditionally rendering `***` text (preserves layout)

### Project Structure Notes

- Check if a Zustand store file already exists in `src/store/` or `src/hooks/` to follow existing pattern
- `PrivacyValue` goes in `src/components/ui/`
- Toggle button goes in existing sidebar/navigation component

### References

- [Source: CLAUDE.md#Fase-12-Architettura] — Zustand v4 established in stack
- [Source: architecture.md#Frontend-Architecture] — Zustand for UI state
- [Source: CLAUDE.md#Layout] — sidebar/navigation structure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues encountered. TypeScript check passed with no errors.

### Completion Notes List

- Created `src/hooks/usePrivacyMode.ts` — Zustand store with `isPrivate` boolean and `toggle()`, persisted to `localStorage` key `ottoboard-privacy-mode`, initialized from localStorage on store creation.
- Created `src/components/ui/PrivacyValue.tsx` — wrapper component applying `blur-sm select-none pointer-events-none` with `transition-all duration-200` when `isPrivate` is true.
- Updated `src/components/ui/Sidebar.tsx` — added `Eye`/`EyeOff` toggle button in both desktop sidebar bottom section and mobile top header. Active state shows orange color, "Privato" text (desktop), and orange dot indicator.
- Finance module: wrapped all sensitive monetary values in `MonthlyHeader` (saldo, entrate, uscite), `TransactionList` (transaction amounts), `SpendingPieChart` (per-category amounts and total), `TotalBalanceWidget` (balance, income, expense).
- Home widgets: wrapped values in `MonthFinanceWidget` (balance, income, expense totals, top-3 category amounts) and `TotalBalanceWidget` (already covered above).
- Fitness module: wrapped distance and duration values in `WeekStatsCard`; applied privacy-aware `tickFormatter` and tooltip `formatter` in `WeightChart`, `BodyFatChart`, `BodyCompositionChart`, `SkinfoldsTrendChart`, `MeasurementsDeltaChart`, `CircumferencesRadarChart` (charts use `isPrivate` directly since Recharts formatters are not React render props).
- Body tab: wrapped all measurement values in `MeasurementHistoryTable` (table cells and detail modal), and body zone tooltip values in `BodyCanvas`.
- Dates, labels, category names, activity types, and non-numeric content are NOT blurred.

### File List

- src/hooks/usePrivacyMode.ts (created)
- src/components/ui/PrivacyValue.tsx (created)
- src/components/ui/Sidebar.tsx (modified)
- src/components/finance/MonthlyHeader.tsx (modified)
- src/components/finance/TransactionList.tsx (modified)
- src/components/finance/SpendingPieChart.tsx (modified)
- src/components/home/TotalBalanceWidget.tsx (modified)
- src/components/home/MonthFinanceWidget.tsx (modified)
- src/components/fitness/WeekStatsCard.tsx (modified)
- src/components/fitness/WeightChart.tsx (modified)
- src/components/fitness/BodyFatChart.tsx (modified)
- src/components/fitness/BodyCompositionChart.tsx (modified)
- src/components/fitness/BodyCanvas.tsx (modified)
- src/components/fitness/MeasurementHistoryTable.tsx (modified)
- src/components/fitness/SkinfoldsTrendChart.tsx (modified)
- src/components/fitness/MeasurementsDeltaChart.tsx (modified)
- src/components/fitness/CircumferencesRadarChart.tsx (modified)
- _bmad-output/implementation-artifacts/6-5-privacy-mode-blur-sensitive-data.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
