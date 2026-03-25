# Story 9.1: Weekly Review Modal

Status: ready-for-dev

## Story

As a user,
I want to see a weekly summary modal on Monday mornings when I open Ottoboard,
so that I can start the week with a clear picture of what happened the previous week.

## Acceptance Criteria

1. **Given** it is Monday and the user opens Ottoboard for the first time that day **When** the home page mounts **Then** a modal opens automatically showing the previous week's summary:
   - **Fitness:** sessions count, total km, total calories, total minutes
   - **Habits:** completion % for each habit scheduled in the previous week
   - **Finance:** total income, total expense, top spending category, expense delta vs previous week
2. **Given** the modal is open **When** the user clicks "Close" or outside the modal **Then** the modal closes and a flag is saved in localStorage (`last_weekly_review_shown: YYYY-MM-DD`) with the current Monday date.
3. **Given** the flag is already set to the current Monday date **When** the user opens Ottoboard again the same day (or later in the same week) **Then** the modal does not reopen.
4. **Given** it is any day other than Monday **When** the home page mounts **Then** the modal is never triggered.
5. **Given** insufficient data for one section **When** that section renders in the modal **Then** it shows a friendly empty state (for example "No workouts last week") and does not crash.

## Tasks / Subtasks

- [ ] Task 1 - Create weekly review data aggregation hook (AC: 1, 5)
  - [ ] Create `src/hooks/useWeeklyReviewSummary.ts`
  - [ ] Use React Query + Supabase client pattern (`queryFn` in hook, no Supabase calls inside components)
  - [ ] Compute previous week and previous-previous week date bounds using local date-safe utilities
  - [ ] Aggregate Fitness summary from `activities` (`count`, `distance`, `calories`, `moving_time`)
  - [ ] Aggregate Habits completion percentages per habit scheduled in the previous week
  - [ ] Aggregate Finance summary from `transactions` (income total, expense total, top category, expense delta)
  - [ ] Return section-safe empty states when data is missing (never throw UI-level errors)

- [ ] Task 2 - Build weekly review modal UI component (AC: 1, 2, 5)
  - [ ] Create `src/components/home/WeeklyReviewModal.tsx`
  - [ ] Follow existing home modal visual pattern (glassmorphism dark card, overlay, close button)
  - [ ] Render 3 sections: Fitness, Habits, Finance with clear labels and values
  - [ ] Implement friendly empty states per section (no blank blocks)
  - [ ] Support dismiss via close button and backdrop click

- [ ] Task 3 - Integrate modal trigger in Home page (AC: 2, 3, 4)
  - [ ] Update `src/app/page.tsx` with modal open state and mount-time trigger check
  - [ ] Trigger only if weekday is Monday and localStorage value differs from current Monday date
  - [ ] On modal close, write `last_weekly_review_shown` with current Monday `YYYY-MM-DD`
  - [ ] Ensure second open in same week does not reopen modal

- [ ] Task 4 - Add date helpers for Monday and week bounds (AC: 1, 2, 3, 4)
  - [ ] Extend `src/lib/dateUtils.ts` with local-safe helpers for current Monday and previous week bounds
  - [ ] Use `toLocalDateStr()` for all localStorage date persistence and date comparisons
  - [ ] Do not use `toISOString().slice(0, 10)` for local date keys

- [ ] Task 5 - Verification and regression safety (AC: 1-5)
  - [ ] Run `npm.cmd run build` and confirm zero TypeScript errors
  - [ ] Manual QA: Monday first open shows modal; closing sets localStorage flag; later opens in same week do not show
  - [ ] Manual QA: non-Monday open does not show modal
  - [ ] Manual QA: no-data states for Fitness/Habits/Finance render friendly fallback text

## Dev Notes

### Story Context

This story introduces a home-level weekly summary interaction, not a new route. The modal is informational and should preserve the fast morning loop on dashboard open.

### Technical Requirements

- Keep all server-state access in hooks (React Query + Supabase client), not in UI components.
- Keep modal UI in `src/components/home/` and mount orchestration in `src/app/page.tsx`.
- Keep date logic local-time-safe using `toLocalDateStr()` patterns to avoid CET off-by-one behavior.
- Keep section rendering resilient: each section must be independently renderable with fallback text.

### Architecture Compliance

- Follow feature-based structure: home component in `components/home`, server data logic in `hooks`.
- Error handling should follow project pattern: throw in hook/query function, manage UX with safe rendering states.
- Avoid introducing global state unless needed; local page state + localStorage is sufficient for one weekly visibility flag.

### Library/Framework Requirements

- Next.js App Router client page (`src/app/page.tsx` already `'use client'`).
- TanStack Query v5 for data aggregation hook.
- Supabase browser client through `createClient()`.
- Existing UI stack: Tailwind classes, lucide-react icons if needed.

### File Structure Requirements

- New hook: `src/hooks/useWeeklyReviewSummary.ts`
- New component: `src/components/home/WeeklyReviewModal.tsx`
- Modified page integration: `src/app/page.tsx`
- Optional utility extension: `src/lib/dateUtils.ts`

### Testing Requirements

- Build must pass with zero TypeScript errors.
- Verify each AC with manual interaction checks.
- Validate timezone correctness by inspecting persisted `last_weekly_review_shown` value and weekday gating behavior.
- Verify no crash on missing data in any section.

### Implementation Guardrails

- Do not fetch Supabase data directly inside `WeeklyReviewModal` component.
- Do not use UTC-based date keys for localStorage comparisons.
- Do not block home rendering while weekly summary loads; modal can show lightweight loading/empty placeholders.
- Do not add a dedicated page for this feature.

### Previous Story Intelligence

- Story 9.1 is the first story in Epic 9, so there is no prior story in this epic to inherit implementation learnings from.
- Reuse established patterns already used in completed stories (modals in home module, query hooks with rollback/error-safe behavior where relevant).

### References

- Epic source and ACs: `_bmad-output/planning_artifacts/epics.md` (Epic 9 / Story 9.1 section)
- Home entry point: `src/app/page.tsx`
- Existing modal pattern examples: `src/components/home/ReminderCreateModal.tsx`, `src/components/home/CompletedRemindersModal.tsx`
- Fitness weekly stats reference: `src/hooks/useWeekStats.ts`
- Habits data model and completion logic reference: `src/hooks/useHabits.ts`
- Finance transactions hook reference: `src/hooks/useTransactions.ts`
- Local-safe date helpers: `src/lib/dateUtils.ts`
- Architecture guardrails: `_bmad-output/planning_artifacts/architecture.md` (date safety, hook boundaries, error handling, structure)
- UX modal and home interaction principles: `_bmad-output/planning_artifacts/ux-design-specification.md` (modal patterns, morning loop)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story file created from Epic 9 context and architecture/UX guardrails.
- Sprint status update required: epic-9 should move to in-progress and story 9-1 to ready-for-dev.

### Completion Notes List

- Comprehensive implementation context prepared for Story 9.1.
- Acceptance criteria translated into implementation tasks and guardrails.
- Technical references and anti-pattern warnings embedded for dev handoff.
- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `_bmad-output/implementation-artifacts/9-1-weekly-review-modal.md` (created)
