---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-19'
inputDocuments:
  - _bmad-output/planning_artifacts/prd.md
  - _bmad-output/planning_artifacts/ux-design-specification.md
  - CLAUDE.md (project instructions + tech stack + gotcha tecnici)
workflowType: 'architecture'
project_name: 'ottoboard'
user_name: 'Marco'
date: '2026-03-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Il progetto comprende 12 fasi completamente implementate organizzate in 6 moduli
applicativi principali (Home, Fitness+Body, Finance, Projects, Habits, Profile) con
3 integrazioni esterne (Strava OAuth, Linear API, Web Push VAPID). Ogni modulo ha
una pagina dedicata, componenti isolati, hook React Query e schema Supabase proprio.

Requisiti funzionali critici:
- Auth: Email/password + magic link con isolamento RLS completo per utente
- Widget system: Dashboard configurabile con DnD, tipi widget eterogenei, config JSONB
- Sync esterna: Strava (pull incrementale), Linear (bidirezionale + webhook), Push (VAPID + cron)
- Offline PWA: SW Workbox per asset + custom SW per notifiche push coesistenti
- Ottimistic updates: Pattern obbligatorio su toggle Habits, DnD Kanban, Reminders checkbox

**Non-Functional Requirements:**
- **Performance**: Morning loop < 60s; interazioni UI < 100ms (ottimistic update obbligatorio)
- **Security**: RLS + WITH CHECK + DEFAULT auth.uid() su ogni tabella; token cifrati
- **Scalabilità**: Single-user self-hosted, free tier (Supabase 500MB, Vercel Hobby)
- **Offline**: Fallback page + asset caching via SW; push funziona anche con app chiusa
- **Accessibilità**: WCAG AA parziale — keyboard nav ✅, screen reader out of scope
- **Responsive**: Mobile-first, singolo breakpoint md: (768px), bottom nav / sidebar desktop

**Scale & Complexity:**
- Primary domain: Full-stack web + PWA
- Complexity level: medium-high
- Estimated architectural components: 80+ componenti React, 15+ tabelle Supabase,
  3 Edge Functions, 1 custom service worker, 6 API routes Next.js

### Technical Constraints & Dependencies

- **Next.js 14 App Router** — no Pages Router, no legacy patterns
- **TypeScript strict** — nessun `any`, tipi generati da Supabase CLI
- **Supabase Free Tier** — 500MB DB, 2GB bandwidth, Edge Functions con cold start
- **Vercel Free/Hobby** — no server-side long-running processes
- **Strava API** — 100 req/15min condivisi tra tutti gli utenti dell'app
- **Linear API** — 1.500 req/hr per API key utente; webhook push-based (no polling)
- **Web Push** — VAPID keys fisse, subscription per device, compatibilità iOS 16.4+

### Cross-Cutting Concerns Identified

1. **Auth/RLS Pattern** — ogni nuova tabella richiede: `DEFAULT auth.uid()` + policy
   `USING + WITH CHECK`. Deviare causa 403 silenti difficili da debuggare.
2. **Timezone Safety** — `toLocalDateStr()` obbligatorio; `toISOString().slice(0,10)`
   introduce bug da UTC+1 in CET. Pattern da enforcement in code review.
3. **Ottimistic Update + Rollback** — pattern usato in Kanban DnD, Habits toggle,
   Reminders checkbox. Consistenza critica per UX "morning loop".
4. **CSS Overflow** — `overflow-x: auto` forza `overflow-y: auto` (CSS spec);
   richiede `overflow-y-hidden` esplicito. Pattern da documentare nei componenti scroll.
5. **Supabase upsert vs update** — upsert con campi parziali sovrascrive con NULL;
   usare `update()` individuale per aggiornamenti parziali (es. reorder colonne).
6. **Service Worker Coesistenza** — SW Workbox (generato da next-pwa) e custom SW
   (push notifications) devono coesistere senza conflitti; separazione via `swSrc`.
7. **Module Design System** — colori per modulo (`orange/emerald/purple/teal/sky/slate`)
   + glassmorphism tokens (`bg-white/[0.03-0.05]`, `border border-white/[0.06-0.10]`,
   `backdrop-blur-2xl`) — consistenza visiva cross-cutting.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web + PWA — brownfield project, già scaffolded e in produzione.
Nessuna valutazione di starter necessaria: la fondazione tecnica è consolidata.

### Selected Foundation: Next.js 14 App Router

**Rationale:** Progetto brownfield completamente implementato. Il setup è stato
inizializzato con `create-next-app --typescript --tailwind --app` e successivamente
esteso con tutte le dipendenze necessarie.

**Stack as Initialized:**

**Language & Runtime:**
TypeScript 5.x strict (`strict: true`) — nessun `any`, tipi Supabase generati via CLI.

**Styling Solution:**
Tailwind CSS 3.x con custom dark theme (`#0a0a0f` base), glassmorphism tokens,
module color palette (orange/emerald/purple/teal/sky/slate).

**Build Tooling:**
Next.js 14 built-in (Turbopack dev, SWC compiler). PWA via `@ducanh2912/next-pwa`
wrappato in `next.config.mjs`. SW disabilitato in development.

**Testing Framework:**
Non configurato (out of scope per progetto personal/solo-developer).

**Code Organization:**
App Router: `src/app/[module]/page.tsx` + `src/components/[module]/` + `src/hooks/`
+ `src/lib/supabase/` + `src/lib/strava/` + `src/types/`.

**Development Experience:**
Vercel CLI per deploy, Supabase CLI per migrazioni e type generation,
`next dev` con hot reload, TypeScript strict per catch errori in fase di sviluppo.

**Note:** Nessuna storia di inizializzazione necessaria — progetto già esistente.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (obbligatori per ogni nuova feature):**
- RLS pattern: DEFAULT auth.uid() + USING + WITH CHECK su ogni nuova tabella
- Timezone: toLocalDateStr() per ogni manipolazione di date locali
- Ottimistic updates: setQueryData → mutation → onError rollback su ogni azione UI istantanea

**Important Decisions (forma l'architettura):**
- Server state via TanStack Query v5; UI state via Zustand v4
- Supabase client diretto da hook — API Routes solo per operazioni server-side
- Edge Functions come proxy sicuro per OAuth e segreti esterni

**Deferred Decisions:** nessuna — progetto in produzione completo.

### Data Architecture

- Database: PostgreSQL via Supabase (RLS built-in, real-time, free tier)
- Schema: per-modulo, user_id su ogni tabella con DEFAULT auth.uid()
- Validation: TypeScript strict + tipi generati da Supabase CLI
- Migrations: Supabase CLI (versionamento SQL)
- Caching: React Query v5 (staleTime configurato per modulo)
- JSONB: config su dashboard_widgets, raw_data su activities

### Authentication & Security

- Auth: Supabase Auth — email/password + magic link
- Authorization: RLS su tutte le tabelle — USING + WITH CHECK obbligatori
- Segreti: token Strava/Linear cifrati in Supabase, mai esposti al client
- Web Push: VAPID keys — private in env server, public in NEXT_PUBLIC_*

### API & Communication Patterns

- CRUD: Supabase client diretto da hook React Query (RLS come guardia)
- Server-only: API Routes Next.js per push notifications
- Integrazioni esterne: Supabase Edge Functions (Strava OAuth, Linear webhook, push cron)
- Real-time: Supabase Realtime per invalidare React Query dopo webhook
- Error handling: React Query onError + rollback ottimistico + toast UI

### Frontend Architecture

- Server state: TanStack Query v5; UI state: Zustand v4
- Struttura: feature-based components/[module]/ + components/ui/ per base
- Routing: App Router flat — una route per modulo
- Ottimistic updates: pattern obbligatorio su DnD, toggle, checkbox
- Responsive: mobile-first, breakpoint unico md: (768px)
- Dark mode: default dark, glassmorphism (bg-white/[0.03-0.05], backdrop-blur-2xl)
- DnD: dnd-kit (useSortable + useDraggable/useDroppable)
- Charts: Recharts 2.x

### Infrastructure & Deployment

- Frontend: Vercel Free/Hobby — deploy automatico da main
- Backend: Supabase Free Tier (DB + Auth + Edge Functions + Storage)
- CI/CD: Vercel Git integration (push → preview → production)
- PWA: next-pwa (Workbox) + custom SW per push; SW off in development
- Monitoring: Vercel logs (personal app — no monitoring formale)

### Decision Impact Analysis

**Implementation Sequence per nuove feature:**
1. Schema DB + migration (con DEFAULT auth.uid())
2. RLS policy (USING + WITH CHECK)
3. Tipi TypeScript (supabase gen types)
4. Hook React Query (con ottimistic update se azione istantanea)
5. Componente UI (feature-based, dark glassmorphism, modulo color)

**Cross-Component Dependencies:**
- Auth context (Supabase session) → tutti i moduli
- React Query QueryClient (in Providers) → tutti gli hook
- Dashboard widgets → dipende da hook di ogni modulo
- Edge Functions → accedono a Supabase service role (non esposto al client)

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming:**
- Tabelle: `snake_case` plurale — `activities`, `transactions`, `dashboard_widgets`
- Colonne: `snake_case` — `user_id`, `created_at`, `body_fat_pct`, `linear_issue_id`
- Chiavi esterne: `{entity}_id` — `category_id`, `project_id`, `user_id`
- UUID primary keys: `DEFAULT gen_random_uuid()` (salvo ID esterni come Strava: BIGINT)
- Enum SQL: valori lowercase quoted — `'income'`, `'expense'`, `'male'`, `'female'`

**Code Naming:**
- Componenti React: PascalCase — `LastActivityCard`, `MonthFinanceWidget`
- File componenti: PascalCase.tsx — `HabitRow.tsx`, `ReminderEditModal.tsx`
- Hook custom: camelCase con prefisso `use` — `useReminders`, `useBodyMeasurements`
- Hook file: camelCase.ts — `useHabits.ts`
- Tipi TypeScript: PascalCase — `Transaction`, `DashboardWidget`, `BodyMeasurement`
- Costanti: UPPER_SNAKE — solo per env vars; altrimenti `as const` objects

**Route/Page Naming:**
- Routes: kebab-case (dove multi-word) — `/fitness`, `/projects` (singolo modulo = singolare)
- File page: `page.tsx` per ogni route in `src/app/[module]/`

### Structure Patterns

**Project Organization:**
```
src/
├── app/[module]/page.tsx       # Una page per modulo — nessun nested dynamic routing
├── components/
│   ├── ui/                     # Componenti base riusabili (Button, Card, Modal, Select...)
│   └── [module]/               # Componenti specifici per modulo — co-located
├── hooks/                      # Hook custom — useReminders.ts, useHabits.ts
├── lib/
│   ├── supabase/               # Client + tipi generati
│   └── strava/                 # API client + tipi Strava
└── types/                      # Tipi TypeScript globali condivisi
```

**Dove mettere cosa:**
- Logica fetch/mutate → hook in `hooks/` (mai dentro componenti direttamente)
- Componenti usati da >1 modulo → `components/ui/`
- Componenti usati da 1 modulo → `components/[module]/`
- Utility functions → `lib/` (non creare `utils/` separata)
- Edge Functions → `supabase/functions/[function-name]/index.ts`

**New Module Checklist:**
1. `src/app/[module]/page.tsx`
2. `src/components/[module]/` directory
3. `src/hooks/use[Module].ts`
4. Migration SQL in `supabase/migrations/`
5. Aggiornare `src/lib/supabase/types.ts` via `supabase gen types`
6. Aggiungere route in `src/components/ui/Sidebar.tsx` + bottom nav mobile

### Format Patterns

**Supabase Response Handling:**
```typescript
// ✅ Corretto — destructure sempre error
const { data, error } = await supabase.from('table').select()
if (error) throw error

// ❌ Sbagliato — ignorare error
const { data } = await supabase.from('table').select()
```

**Date/Time:**
```typescript
// ✅ Corretto — date locali
const toLocalDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`

// ❌ Sbagliato — UTC shift in CET
date.toISOString().slice(0, 10)
```

**JSON fields in Supabase:** snake_case — corrisponde 1:1 alle colonne DB. Nessuna trasformazione camelCase.

**Importi finanziari:** `DECIMAL(10,2)` in DB, `number` in TypeScript, sempre positivi — il `type` ('income'/'expense') determina il segno.

### Communication Patterns

**React Query — Hook Pattern Standard:**
```typescript
export function useReminders() {
  const queryClient = useQueryClient()

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: fetchReminders,
    staleTime: 30_000,
  })

  const completeMutation = useMutation({
    mutationFn: completeReminder,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] })
      const previous = queryClient.getQueryData(['reminders'])
      queryClient.setQueryData(['reminders'], (old) => /* updated */)
      return { previous }
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(['reminders'], context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  })

  return { reminders, isLoading, complete: completeMutation.mutate }
}
```

**Supabase Client — Update vs Upsert:**
```typescript
// ✅ Update individuale per aggiornamenti parziali (es. reorder)
await supabase.from('columns').update({ position: newPos }).eq('id', col.id)

// ❌ Upsert con campi parziali — sovrascrive i campi mancanti con NULL
await supabase.from('columns').upsert({ id: col.id, position: newPos })
```

**Zustand — solo per UI state:**
```typescript
// ✅ Zustand: stato modale, sidebar collapsed, tab attiva
useUIStore(state => state.isSidebarOpen)

// ❌ Zustand: dati server (appartengono a React Query)
useUIStore(state => state.transactions)
```

### Process Patterns

**Error Handling:**
- Errori Supabase → throw → catchati da React Query `onError` → toast UI
- Nessun `try/catch` nei componenti — la gestione errori vive negli hook
- Toast per errori utente-visibili, `console.error` per errori di debug
- Ottimistic update fallito → rollback silenzioso + toast "Operazione non riuscita, riprova"

**Loading States:**
- `isLoading` da React Query per scheletri/spinner iniziali
- `isPending` da mutation per disabilitare bottoni durante submit
- `GlobalLoadingBar` (in layout) per `useIsFetching() > 0` — nessun spinner globale aggiuntivo
- Skeleton UI > spinner per liste e card (evita layout shift)

**CSS Overflow:**
```tsx
// ✅ Corretto — overflow-y esplicito quando serve scroll orizzontale
<div className="overflow-x-auto overflow-y-hidden">

// ❌ Sbagliato — overflow-x: auto imposta implicitamente overflow-y: auto
<div className="overflow-x-auto">
```

**Select con dropdown vicino al fondo:**
```tsx
// ✅ Usare dropUp quando Select è vicino al viewport bottom
<Select dropUp options={...} />

// ❌ Non mettere overflow-hidden su container con Select
<div className="overflow-hidden"> <Select /> </div>  // dropdown tagliato
```

**RLS — Ogni Nuova Tabella:**
```sql
ALTER TABLE new_table ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE POLICY "Users can only see their own data"
ON new_table FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Usare `toLocalDateStr()` per qualsiasi data locale (mai `toISOString().slice(0,10)`)
- Applicare RLS pattern completo (DEFAULT + USING + WITH CHECK) su ogni nuova tabella
- Implementare ottimistic update + rollback su ogni mutation che modifica lo stato UI istantaneamente
- Usare `update()` individuale (non `upsert()`) per aggiornamenti parziali
- Collocare componenti in `components/[module]/` o `components/ui/` — mai in `app/`
- Usare colori modulo corretti: orange=fitness, emerald=finance, purple=projects, teal=habits, sky=profile, slate=home

**Anti-Patterns da Evitare:**
- ❌ `date.toISOString().slice(0, 10)` → bug timezone CET
- ❌ `overflow-x-auto` senza `overflow-y-hidden` → scroll verticale indesiderato
- ❌ `upsert` con campi parziali → sovrascrittura NULL
- ❌ Query Supabase direttamente nei componenti → vanno negli hook
- ❌ `overflow-hidden` su container con `Select` → dropdown tagliato
- ❌ Creare colonne senza `DEFAULT auth.uid()` → 403 su INSERT client-side
- ❌ Usare `green` al posto di `emerald` per finance → palette sbagliata

## Project Structure & Boundaries

### Complete Project Directory Structure

```
ottoboard/
├── CLAUDE.md                        # Project instructions + tech stack + gotcha tecnici
├── package.json
├── next.config.mjs                  # withPWA(...) wrapper
├── tailwind.config.ts               # Custom dark theme + module colors
├── tsconfig.json                    # strict: true
├── postcss.config.mjs
├── vercel.json                      # Deploy config + cron job
│
├── public/
│   ├── manifest.json                # Web App Manifest (PWA)
│   ├── apple-touch-icon.png
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── custom-sw.js                 # Handler push + notificationclick (custom SW)
│
└── src/
    ├── app/
    │   ├── layout.tsx               # Root layout: Providers + ConditionalSidebar + GlobalLoadingBar
    │   ├── page.tsx                 # Home — widget dashboard configurabile
    │   ├── providers.tsx            # QueryClient + Zustand + Supabase session
    │   ├── globals.css
    │   ├── sw.ts                    # Service worker registration helper
    │   ├── fonts/                   # GeistVF.woff, GeistMonoVF.woff
    │   │
    │   ├── auth/
    │   │   ├── callback/route.ts    # OAuth callback Supabase
    │   │   ├── login/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   └── reset-password/page.tsx
    │   │
    │   ├── onboarding/page.tsx      # Wizard primo accesso (categorie + Strava)
    │   ├── offline/page.tsx         # PWA offline fallback
    │   │
    │   ├── fitness/
    │   │   ├── page.tsx
    │   │   └── FitnessContent.tsx   # Client component (tab Strava / Corpo)
    │   ├── finance/page.tsx
    │   ├── projects/page.tsx
    │   ├── habits/page.tsx
    │   ├── profile/page.tsx
    │   │
    │   └── api/
    │       ├── strava/
    │       │   ├── callback/route.ts
    │       │   ├── connect/route.ts
    │       │   ├── disconnect/route.ts
    │       │   ├── status/route.ts
    │       │   └── sync/route.ts
    │       ├── linear/
    │       │   ├── connect/route.ts
    │       │   ├── disconnect/route.ts
    │       │   ├── status/route.ts
    │       │   ├── sync/route.ts
    │       │   ├── teams/route.ts
    │       │   ├── select-team/route.ts
    │       │   ├── create-issue/route.ts
    │       │   ├── create-project/route.ts
    │       │   └── update-issue/route.ts
    │       ├── notifications/
    │       │   ├── subscribe/route.ts
    │       │   ├── status/route.ts
    │       │   └── cron/route.ts    # Scheduled push (Vercel Cron)
    │       └── onboarding/
    │           └── seed-categories/route.ts
    │
    ├── components/
    │   ├── ui/                      # Base components (riusabili cross-modulo)
    │   │   ├── Select.tsx           # dropUp prop
    │   │   ├── Sidebar.tsx          # Desktop nav + module colors
    │   │   ├── ConditionalSidebar.tsx
    │   │   └── GlobalLoadingBar.tsx
    │   │
    │   ├── fitness/
    │   │   ├── LastActivityCard.tsx  # bare prop
    │   │   ├── WeekStatsCard.tsx     # bare prop
    │   │   ├── WeeklyVolumeChart.tsx
    │   │   ├── PaceTrendChart.tsx
    │   │   ├── HeartRateChart.tsx
    │   │   ├── ActivityHeatmap.tsx   # toLocalDateStr, overflow-y-hidden
    │   │   ├── ActivityList.tsx
    │   │   ├── ActivityModal.tsx
    │   │   ├── ActivityBadge.tsx
    │   │   ├── StravaConnect.tsx
    │   │   ├── PolylineMap.tsx
    │   │   ├── BodyMeasurementsTab.tsx
    │   │   ├── MeasurementForm.tsx
    │   │   ├── BodyCanvas.tsx        # SVG interattivo anteriore/posteriore
    │   │   ├── MuscleBody.tsx
    │   │   ├── BodyCompositionChart.tsx
    │   │   ├── WeightChart.tsx
    │   │   ├── BodyFatChart.tsx
    │   │   ├── CircumferencesRadarChart.tsx
    │   │   ├── MeasurementsDeltaChart.tsx
    │   │   ├── SkinfoldsTrendChart.tsx
    │   │   └── MeasurementHistoryTable.tsx
    │   │
    │   ├── finance/
    │   │   ├── MonthlyHeader.tsx
    │   │   ├── TransactionForm.tsx
    │   │   ├── TransactionList.tsx
    │   │   ├── TransactionEditModal.tsx
    │   │   ├── SpendingPieChart.tsx
    │   │   ├── MonthlyBarChart.tsx
    │   │   ├── BudgetTracker.tsx
    │   │   ├── CategoryManager.tsx
    │   │   ├── CSVImport.tsx
    │   │   ├── RecurringTransactionManager.tsx
    │   │   ├── FirstTimeSetup.tsx
    │   │   ├── GoalsSection.tsx
    │   │   ├── GoalCard.tsx
    │   │   ├── GoalCreateModal.tsx
    │   │   ├── GoalEditModal.tsx
    │   │   ├── GoalUpdateModal.tsx
    │   │   └── RuleCard5030.tsx
    │   │
    │   ├── projects/
    │   │   ├── KanbanBoard.tsx
    │   │   ├── KanbanColumn.tsx
    │   │   ├── TaskCard.tsx          # linear_identifier, priority badge
    │   │   ├── TaskDetailModal.tsx
    │   │   ├── NewTaskModal.tsx
    │   │   ├── ProjectSidebar.tsx    # hidden su mobile
    │   │   ├── ProjectFormModal.tsx
    │   │   ├── LinearNotConnectedBanner.tsx
    │   │   ├── PriorityBadge.tsx
    │   │   ├── DueDateBadge.tsx
    │   │   ├── LabelBadge.tsx
    │   │   └── ColorDot.tsx
    │   │
    │   ├── habits/
    │   │   ├── HabitsContent.tsx
    │   │   ├── HabitRow.tsx
    │   │   ├── HabitHeatmap.tsx
    │   │   ├── HabitCreateModal.tsx
    │   │   └── HabitEditModal.tsx
    │   │
    │   ├── home/
    │   │   ├── WidgetShell.tsx       # DnD wrapper, drag handle, actions
    │   │   ├── AddWidgetModal.tsx
    │   │   ├── KanbanColumnWidget.tsx
    │   │   ├── MonthFinanceWidget.tsx
    │   │   ├── TotalBalanceWidget.tsx # bare prop
    │   │   ├── HabitsWidget.tsx
    │   │   ├── FinancialGoalWidget.tsx
    │   │   ├── RemindersWidget.tsx
    │   │   ├── ReminderRow.tsx
    │   │   ├── ReminderCreateModal.tsx
    │   │   ├── ReminderEditModal.tsx
    │   │   └── CompletedRemindersModal.tsx
    │   │
    │   └── profile/
    │       ├── AccountInfoSection.tsx
    │       ├── ChangePasswordForm.tsx
    │       ├── StravaIntegrationCard.tsx
    │       ├── LinearIntegrationCard.tsx
    │       ├── NotificationsCard.tsx
    │       └── BodyProfileSection.tsx
    │
    ├── hooks/
    │   ├── useActivities.ts
    │   ├── useWeekStats.ts
    │   ├── useBodyMeasurements.ts
    │   ├── useStravaConnection.ts
    │   ├── useTransactions.ts
    │   ├── useFinanceMutations.ts
    │   ├── useMonthStats.ts
    │   ├── useCategories.ts
    │   ├── useBudgets.ts
    │   ├── useFinancialGoals.ts
    │   ├── useRecurringTransactions.ts
    │   ├── useProjects.ts
    │   ├── useProjectMutations.ts
    │   ├── useProjectStore.ts        # Zustand — progetto selezionato
    │   ├── useColumns.ts
    │   ├── useColumnMutations.ts
    │   ├── useTasks.ts
    │   ├── useTaskMutations.ts
    │   ├── useLinearConnection.ts
    │   ├── useLinearIssueUpdate.ts
    │   ├── useHabits.ts
    │   ├── useReminders.ts
    │   ├── useDashboardWidgets.ts
    │   └── useNotificationPermission.ts
    │
    ├── lib/
    │   ├── dateUtils.ts              # toLocalDateStr() e altre utility date
    │   ├── bodyComposition.ts        # Formule Jackson-Pollock (JP3/JP7 + Siri)
    │   ├── supabase/
    │   │   ├── client.ts             # createBrowserClient (componenti client)
    │   │   ├── server.ts             # createServerClient (API routes, layout)
    │   │   ├── admin.ts              # createAdminClient (service role — solo server)
    │   │   └── middleware.ts         # Session refresh middleware
    │   ├── strava/
    │   │   ├── client.ts
    │   │   ├── api.ts
    │   │   ├── types.ts
    │   │   ├── transforms.ts         # Strava API → DB schema
    │   │   └── polyline.ts
    │   └── linear/
    │       ├── client.ts
    │       ├── queries.ts            # GraphQL queries Linear API
    │       ├── types.ts
    │       ├── transforms.ts         # Linear API → DB cache schema
    │       └── crypto.ts             # Cifratura API key Linear
    │
    ├── middleware.ts                 # Auth guard — redirect non-autenticati
    │
    └── types/
        ├── index.ts                  # Tipi globali (Transaction, Activity, Widget...)
        └── habits.ts                 # Tipi specifici habits
```

### Architectural Boundaries

**API Boundaries:**
- `src/app/api/strava/*` — OAuth flow + sync; usa `lib/supabase/server.ts` + `lib/strava/`
- `src/app/api/linear/*` — integrazione Linear; usa `lib/linear/` (crypto per API key)
- `src/app/api/notifications/*` — subscribe, status, cron push; usa `lib/supabase/admin.ts`
- Tutte le API routes usano `createServerClient` o `createAdminClient` — mai `createBrowserClient`

**Component Boundaries:**
- `components/[module]/` non importa da altri moduli — solo da `components/ui/`
- `components/home/` consuma dati via hook specifici dei moduli, non direttamente
- `WidgetShell` — unico componente con DnD logic; i widget interni sono puri display
- `bare` prop pattern — componenti con doppio uso (standalone + widget) rimuovono outer card con `bare=true`

**Service Boundaries:**
- `lib/supabase/client.ts` → solo browser/client components
- `lib/supabase/server.ts` → server components, API routes (cookie session)
- `lib/supabase/admin.ts` → operazioni privilegiate (push cron, seed) — `SERVICE_ROLE_KEY`
- `lib/linear/crypto.ts` → cifratura/decifratura API key — solo server-side

### Requirements to Structure Mapping

| Modulo | Pages | Components | Hooks | API Routes |
|--------|-------|------------|-------|------------|
| Auth | `auth/*/page.tsx` | — | — | `auth/callback` |
| Onboarding | `onboarding/page.tsx` | — | — | `onboarding/seed-categories` |
| Home/Widget | `page.tsx` | `home/*` | `useDashboardWidgets` | — |
| Fitness/Strava | `fitness/page.tsx` | `fitness/Activity*`, `fitness/Strava*` | `useActivities`, `useWeekStats`, `useStravaConnection` | `strava/*` |
| Body Measurements | (tab fitness) | `fitness/Body*`, `fitness/Measurement*`, `fitness/Weight*` | `useBodyMeasurements` | — |
| Finance | `finance/page.tsx` | `finance/*` | `useTransactions`, `useCategories`, `useBudgets`, `useFinancialGoals` | — |
| Projects/Linear | `projects/page.tsx` | `projects/*` | `useProjects`, `useTasks`, `useLinearConnection` | `linear/*` |
| Habits | `habits/page.tsx` | `habits/*` | `useHabits` | — |
| Reminders | (widget home) | `home/Reminders*`, `home/ReminderRow` | `useReminders` | — |
| Push Notifications | — | `profile/NotificationsCard` | `useNotificationPermission` | `notifications/*` |
| Profile | `profile/page.tsx` | `profile/*` | `useStravaConnection`, `useLinearConnection`, `useNotificationPermission` | — |
| PWA | `offline/page.tsx` | — | — | — |

### Integration Points

**Data Flow:**
```
User action → React component
           → Hook (ottimistic update via queryClient.setQueryData)
           → Supabase client → PostgreSQL (RLS check)
           → onSettled: invalidateQueries
           → React Query refetch → UI aggiornata
```

**External Integrations:**
- Strava: `api/strava/sync` → `lib/strava/api.ts` → Strava REST API → upsert `activities`
- Linear: `api/linear/sync` → `lib/linear/client.ts` → Linear GraphQL → upsert cache locale
- Web Push: `api/notifications/cron` (Vercel Cron) → `web-push` → browser subscription endpoint

**Development Workflow:**
- `next dev` — SW disabilitato (next-pwa development mode off)
- `vercel build` + deploy → SW generato, custom-sw.js incluso
- `supabase gen types typescript` → aggiorna `lib/supabase/` types dopo ogni migration

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Tutto lo stack è compatibile senza conflitti: Next.js 14 App Router + TypeScript strict +
Tailwind + Supabase + Vercel + TanStack Query v5 + Zustand v4 + dnd-kit + Recharts 2.x +
@ducanh2912/next-pwa + custom SW coesistenti via swSrc.

**Pattern Consistency:**
Ottimistic update pattern uniforme in tutti i moduli. RLS pattern (DEFAULT + USING + WITH CHECK)
coerente su tutte le tabelle. toLocalDateStr() centralizzato in lib/dateUtils.ts.
bare prop pattern coerente tra LastActivityCard, WeekStatsCard, TotalBalanceWidget.

**Structure Alignment:**
Struttura feature-based allineata con App Router flat. lib/supabase/ tripartito
(client/server/admin) allineato con i tre contesti di utilizzo.
Hook in hooks/ separati dai componenti — boundary pulito.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
Tutti i moduli (Auth, Home, Fitness+Body, Finance, Projects+Linear, Habits, Reminders,
Push Notifications, Profile, PWA) hanno supporto architetturale completo — pagine,
componenti, hook, API routes e lib dedicati documentati.

**Non-Functional Requirements Coverage:**
- Performance (< 60s morning loop): React Query caching + ottimistic updates ✅
- Security: RLS + segreti in env vars + admin client isolato ✅
- Offline: Workbox (asset) + custom SW (push) + offline/page.tsx ✅
- Responsive: breakpoint unico md: + bottom nav mobile ✅
- WCAG AA parziale: keyboard nav via componenti standard ✅

### Implementation Readiness Validation ✅

**Decision Completeness:** Tutte le decisioni critiche documentate con tecnologie e versioni.
**Structure Completeness:** Struttura directory completa con file reali da codebase.
**Pattern Completeness:** Anti-pattern espliciti + esempi codice per ogni pattern critico.

### Gap Analysis Results

**Critical Gaps:** nessuno.
**Important Gaps (non bloccanti):**
- Schema DB completo non incluso — autoritativo in CLAUDE.md
- vercel.json cron config non dettagliata — configurazione operativa, non architetturale

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (medium-high, 12 moduli, 3 integrazioni)
- [x] Technical constraints identified (free tier, rate limits, iOS 16.4+)
- [x] Cross-cutting concerns mapped (7 aree critiche)

**✅ Architectural Decisions**
- [x] Critical decisions documented (stack, RLS, timezone, ottimistic updates)
- [x] Technology stack fully specified
- [x] Integration patterns defined (Strava pull, Linear bidirezionale, Web Push)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (DB snake_case, React PascalCase)
- [x] Structure patterns defined (New Module Checklist)
- [x] Communication patterns specified (React Query hook pattern standard)
- [x] Process patterns documented (error handling, loading states, CSS overflow, Select)

**✅ Project Structure**
- [x] Complete directory structure defined (file reali da codebase)
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — progetto brownfield con codebase esistente come reference.

**Key Strengths:**
- Pattern documentati con esempi di codice reali estratti dalla codebase
- Anti-pattern espliciti basati su bug reali già incontrati (timezone, overflow, upsert)
- New Module Checklist operativa (6 step)
- Struttura directory verificata dalla codebase reale

**Areas for Future Enhancement:**
- Schema DB aggregato in un'unica sezione dell'architecture doc
- Diagramma Mermaid del data flow
- Lista completa env vars richieste per setup nuovo ambiente

### Implementation Handoff

**AI Agent Guidelines:**
- Seguire il New Module Checklist per ogni nuova feature
- Consultare la sezione Anti-Patterns prima di implementare date, overflow CSS, Select, upsert
- Usare i colori modulo corretti: orange/emerald/purple/teal/sky/slate
- Applicare il React Query Hook Pattern Standard per ogni nuovo hook
- Verificare RLS pattern completo su ogni nuova tabella Supabase

**First Implementation Priority:**
Progetto brownfield in produzione — nessuna inizializzazione necessaria.
Per nuove feature: seguire il Decision Impact Analysis → Implementation Sequence (5 step).
