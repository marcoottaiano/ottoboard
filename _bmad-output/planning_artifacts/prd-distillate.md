---
type: bmad-distillate
sources:
  - "_bmad-output/planning_artifacts/prd.md"
downstream_consumer: "architecture design"
created: "2026-03-19"
token_estimate: 850
parts: 1
---

## Executive Summary & Vision
- **Core:** Modular personal dashboard/PWA for centralizing fitness, finance, and productivity data.
- **Vision:** Single, private, subscription-free "Control Center" eliminating digital fragmentation and app-switching costs.
- **Differentiator:** "Integration-First Hub" allowing direct action (Linear task management) and athletic monitoring (Strava) in one self-hosted interface.
- **Success Metric:** Absolute data trust (Linear sync accuracy), frictionless interaction (<3 clicks for core tasks), and 100% daily utility for the owner.

## Project Classification & Technical Context
- **Type:** Web App (PWA) / Integration-First Hub.
- **Domain:** Fintech (Finance) + Health (Strava/Body Stats) + Productivity (Linear).
- **Stack:** Next.js 14 (App Router), TypeScript 5, Supabase (PostgreSQL, Auth, RLS, Edge Functions, Realtime).
- **Context:** Brownfield project focusing on stabilization, data reconciliation, and integration resilience.
- **Performance Targets:** Lighthouse Score >90, PLT <1.5s for cached widgets, <100ms for local UI interactions.
- **Browser Support:** Modern Evergreen browsers (Chrome, Safari 16.4+, Firefox, Edge).

## Functional Requirements (Capability Contract)

### Integration & Sync (Linear/Strava)
- **Bidirectional Sync:** 100% consistency between Linear API and Supabase cache.
- **Force Reconciliation:** Manual trigger to align local state with external APIs.
- **Atomic Operations:** DB operations must be atomic to prevent data corruption or partial updates.
- **Sync Health:** UI-visible human-readable status/error logs for integrations.
- **Token Management:** Background auto-refresh for OAuth tokens; proactive banners for near-expiry.
- **Sync Scope:** User-configurable Strava sync range (Full history vs. last 30 days).

### Home Dashboard & Widgets
- **Customization:** Add, remove, reorder widgets; state persistence across sessions.
- **Real-time Updates:** Real-time UI reflection of Linear changes via Supabase Realtime.
- **Direct Actions:** Widget-level task completion and status changes.
- **Feedback:** Visual sync indicators (toasts/bars) during long-running background tasks.
- **Privacy Mode:** One-click toggle to blur sensitive numerical data (balances, weight).
- **Empty States:** Contextual CTAs when data is missing.

### Financial Management (Euro Base)
- **Transactions:** Manual entry + CSV import with automated mapping.
- **Integrity:** Multi-field deduplication (date, amount, desc); high-precision decimals for balances.
- **Budgets:** Monthly category-specific budget monitoring.
- **Local Intelligence:** Zero-cost client-side spending trends and prediction engine.
- **Bulk Operations:** Multi-select deletion and categorization.
- **Manual Lock:** Capability to "lock" transaction categories against automated overrides.

### Fitness & Health
- **Strava Visualization:** Volume, pace, and heart rate trends.
- **Body Stats:** Weight, skinfold, and circumference tracking.
- **Scientific Validation:** Body composition calculations via Jackson-Pollock 3/7-site protocols.
- **BodyCanvas:** Interactive SVG map for measurement zone selection.
- **Temporal Consistency:** Timezone-aware activity and reminder display.

### Notifications & Reminders
- **PWA Push:** Background notifications for due reminders via Service Worker.
- **Recurring Engine:** Management of daily, weekly, monthly reminders.
- **Notification Center:** In-app fallback UI when push permissions are disabled.

### User & System Admin
- **Data Isolation:** Hard tenant isolation via Supabase RLS.
- **Security:** Account management, password reset, and encrypted at-rest API credentials.
- **Onboarding:** Guided first-run wizard for integration and module setup.

## Scoping & Phased Roadmap
- **Phase 1 (Stabilization):** Fix bidirectional Linear sync, Service Worker Push, and Integration Health Dashboard.
- **Phase 2 (Growth):** Validate Body Measurements logic, interactive BodyCanvas, Habits widget optimization, and Beta Onboarding.
- **Phase 3 (Vision):** Client-side Finance AI (patterns/anomalies) and "Smart" Nutrition module.

## Non-Functional & Domain Requirements
- **Resilience:** "Read-Only" fail-safe showing cached data with "Stale" indicator when APIs are offline.
- **Accessibility:** "Keyboard-First" navigability for all critical actions.
- **Security:** Credential encryption at rest; multi-tenant isolation via RLS.
- **Integrity:** Accuracy in scientific health calculations and high-precision fintech math.
