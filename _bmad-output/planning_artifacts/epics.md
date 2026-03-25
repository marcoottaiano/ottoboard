---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning_artifacts/prd.md
  - _bmad-output/planning_artifacts/architecture.md
  - _bmad-output/planning_artifacts/ux-design-specification.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-23.md
---

# ottoboard - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ottoboard, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The user can connect external accounts (Strava, Linear) via a dedicated settings interface.
FR2: The system can perform a bidirectional sync with Linear Projects and Issues.
FR3: The user can trigger a manual "Force Reconciliation" to align local cache with external API states.
FR4: The system can detect and display human-readable status/error logs for each external integration.
FR5: The system can automatically refresh expired OAuth tokens in the background.
FR6: The user can customize the home dashboard by adding, removing, or reordering functional widgets.
FR7: The system can display real-time updates for synced Linear tasks within the dashboard widgets.
FR8: The user can take direct actions (e.g., mark task as complete) from dashboard widgets.
FR9: The system can provide visual feedback (toasts/bars) during background sync operations.
FR10: The user can manually record income and expense transactions (Euro only).
FR11: The user can import financial data via CSV files with automated column mapping.
FR12: The system can identify and flag potentially duplicate transactions during CSV import.
FR13: The user can define and monitor monthly budgets for specific expense categories.
FR14: The system can provide local (client-side) insights on spending trends and budget alerts.
FR15: The system can visualize athletic activities synced from Strava (volume, pace, heart rate trends).
FR16: The user can record body measurements (weight, skinfolds, circumferences).
FR17: The system can calculate body composition using validated formulas (Jackson-Pollock).
FR18: The user can interact with a visual map (BodyCanvas) to update specific measurement zones.
FR19: The system can schedule and deliver push notifications for reminders even when the app is closed.
FR20: The user can manage notification permissions and settings.
FR21: The user can create and manage recurring reminders.
FR22: The system can isolate user data using a secure multi-tenant architecture (RLS).
FR23: The user can manage their personal profile and security settings.
FR24: The system can provide an onboarding flow for new users to configure core modules.
FR25: The user can toggle a "Privacy Mode" to blur or hide sensitive numerical data.
FR26: The user can configure the scope of the initial Strava sync (full history vs. last 30 days).
FR27: The system can display activities and reminders adjusted to the user's local timezone.
FR28: The system can ensure atomic database operations during synchronization to prevent data corruption.
FR29: The system can notify the user via UI banners if an integration token is nearing expiration.
FR30: The system can display contextual "Call to Action" guides in widgets when no data is available.
FR31: The system can persist user-defined filters and view states for each dashboard widget.
FR32: The user can perform bulk operations (delete, categorize) on multiple transactions simultaneously.
FR33: The user can manually override and "lock" the category of a transaction.
FR34: The system can display an in-app "Notification Center" if system push notifications are disabled.

### NonFunctional Requirements

NFR1: All local UI interactions (modal openings, filter toggles) must feel instantaneous (< 100ms).
NFR2: Initial dashboard load with cached data must occur in < 1.5 seconds on 4G/5G networks.
NFR3: Synchronization with external APIs (Linear/Strava) must not block the main UI thread.
NFR4: Each user must have exclusive access to their data via Supabase Row Level Security (RLS).
NFR5: All API keys and OAuth tokens must be encrypted at rest within the database.
NFR6: The system must support immediate obfuscation of sensitive data (Privacy Mode).
NFR7: Synchronization operations must be atomic; in case of failure, the system must rollback or flag data as "incomplete."
NFR8: Core dashboard data (cached) must remain available even when external Linear or Strava APIs are offline.
NFR9: The system must automatically refresh Strava tokens before expiration in 99% of cases.
NFR10: All critical actions must be fully executable via keyboard shortcuts and tab navigation.

### Additional Requirements

- Brownfield project (Phases 1–12 fully implemented); nessuna inizializzazione necessaria.
- RLS pattern obbligatorio su ogni nuova tabella: DEFAULT auth.uid() + USING + WITH CHECK.
- Timezone safety: usare toLocalDateStr() per ogni data locale; vietato toISOString().slice(0,10).
- Optimistic update + rollback obbligatorio su ogni action istantanea (Kanban DnD, Habits toggle, Reminders checkbox).
- Usare update() individuale (non upsert()) per aggiornamenti parziali su Supabase.
- Service Worker: Workbox (next-pwa) + custom SW (push) devono coesistere via swSrc senza conflitti.
- Module Design System: colori per modulo (orange=fitness, emerald=finance, purple=projects, teal=habits, sky=profile, slate=home) + glassmorphism tokens (bg-white/[0.03-0.05], border-white/[0.06-0.10], backdrop-blur-2xl).
- Supabase Free Tier: 500MB DB, 2GB bandwidth, 500k Edge Function invocations/month — evitare chiamate ridondanti.
- Strava API: 100 req/15min condivisi tra tutti gli utenti dell'app — sync incrementale obbligatorio.
- Linear API: 1.500 req/hr per API key utente; webhook push-based (no polling).
- Web Push VAPID: iOS 16.4+ richiesto; subscription per device; gestire subscription scadute (410).
- Vercel Cron: configurato in vercel.json per push notifications scheduler.

### UX Design Requirements

UX-DR1: Ogni widget home deve mostrare un SyncStatusBadge (live/stale indicator) — visibile direttamente sul widget, senza navigare al profilo.
UX-DR2: La sezione Profile/Integrations deve includere un IntegrationHealthCard con log di errore leggibili + ForceReconciliationButton per Linear e Strava.
UX-DR3: Ogni widget in stato vuoto o errore deve mostrare un contextual CTA (empty state: icona modulo + messaggio + link/pulsante azione) — nessuno stato bianco silenzioso.
UX-DR4: L'OnboardingWizard deve validare le API key in real-time (inline al campo) prima di procedere; ogni step è skippabile senza broken states dopo il completamento.
UX-DR5: La NotificationPermissionBanner in home deve essere non invasiva, dismissibile e rispettare lo stato localStorage (non riapparire dopo il dismiss dell'utente).
UX-DR6: Tutti i form devono usare validazione inline al campo (non on-submit); i campi opzionali non hanno asterisco né messaggi "incompleto" — partial entry è sempre uno stato valido.
UX-DR7: I Select component vicini al fondo viewport devono usare dropUp={true} — il dropdown si apre verso l'alto (bottom-full mb-1).
UX-DR8: Nessun container contenente Select deve avere overflow-hidden — il dropdown verrebbe tagliato dal CSS.
UX-DR9: Skeleton loaders (animate-pulse bg-white/5 rounded) al posto di spinner bloccanti per liste e card in loading.
UX-DR10: Le azioni distruttive usano confirm inline nel widget/riga (es. "Rimuovi?" → "Conferma" / "Annulla") — mai una modale separata.
UX-DR11: Il morning control loop (apri → leggi → agisci) deve essere completabile in ≤ 60 secondi senza navigare fuori dalla home.
UX-DR12: Stale data indicator sul widget stesso (non nascosto nel profilo) — mostrare "Last sync: Xh fa" o badge di errore direttamente sul KanbanColumnWidget e LastActivityCard.

### FR Coverage Map

FR1: Epic 5 — Connessione Strava/Linear via UI settings
FR2: Epic 1 — Sync bidirezionale Linear
FR3: Epic 1 — Force Reconciliation manuale
FR4: Epic 1 — Log errori leggibili per integrazione
FR5: Epic 1 — Refresh automatico token scaduti
FR6: Epic 3 — Personalizzazione widget home
FR7: Epic 1 — Real-time updates Linear nei widget
FR8: Epic 3 — Azioni dirette dai widget (complete, drag)
FR9: Epic 1 — Visual feedback sync (toast/bar)
FR10: Epic 4 — Registrazione manuale transazioni
FR11: Epic 4 — Import CSV con column mapping
FR12: Epic 4 — Deduplicazione automatica CSV import
FR13: Epic 4 — Budget mensili per categoria
FR14: Epic 4 — Insights spesa client-side
FR15: Epic 6 — Visualizzazione attività Strava
FR16: Epic 6 — Registrazione misurazioni corporee
FR17: Epic 6 — Calcolo composizione corporea (JP)
FR18: Epic 6 — BodyCanvas interattivo
FR19: Epic 2 — Push notifications reminders
FR20: Epic 2 — Gestione permessi notifiche
FR21: Epic 2 — Reminder ricorrenti
FR22: Epic 5 — Isolamento dati multi-tenant (RLS)
FR23: Epic 5 — Profilo e impostazioni sicurezza
FR24: Epic 5 — Onboarding wizard nuovo utente
FR25: Epic 6 — Privacy Mode (offuscamento dati)
FR26: Epic 5 — Scope sync Strava (storia completa / 30gg)
FR27: Epic 6 — Timezone locale per attività/reminder
FR28: Epic 1 — Operazioni DB atomiche durante sync
FR29: Epic 1 — Banner scadenza token integrazione
FR30: Epic 3 — CTA contestuali su widget vuoti
FR31: Epic 3 — Persistenza filtri/stati widget
FR32: Epic 4 — Bulk operations transazioni
FR33: Epic 4 — Lock categoria transazione
FR34: Epic 2 — In-app Notification Center (fallback push)
FR-NEW-1: Epic 7 — Rimozione modulo Progetti
FR-NEW-2: Epic 7 — Rimozione sistema Push Notifications
FR-NEW-3: Epic 8 — Creazione savings goal
FR-NEW-4: Epic 8 — Waterfall allocation saldo
FR-NEW-5: Epic 8 — Riordino goals drag & drop
FR-NEW-6: Epic 8 — Visualizzazione progresso goal
FR-NEW-7: Epic 8 — Ricalcolo automatico al variare del saldo
FR-NEW-8: Epic 9 — Weekly review modal lunedì
FR-NEW-9: Epic 9 — Persistenza stato "già mostrato"
FR-NEW-10: Epic 10 — Creazione viaggio (meta, date, note)
FR-NEW-11: Epic 10 — Itinerario drag & drop con slot orari
FR-NEW-12: Epic 10 — Ristoranti e attrazioni con link
FR-NEW-13: Epic 10 — Alloggi con link
FR-NEW-14: Epic 10 — Budget aggregato viaggio
FR-NEW-15: Epic 10 — Export/import itinerario
FR-NEW-16: Epic 10 — Generazione percorso Maps
FR-NEW-17: Epic 10 — Condivisione pubblica read-only via link
FR-NEW-18: Epic 11 — Item wishlist (nome, link, prezzo, foto)
FR-NEW-19: Epic 11 — Status item (desired/received/purchased)
FR-NEW-20: Epic 11 — Organizzazione per categoria/occasione
FR-NEW-21: Epic 11 — Condivisione pubblica read-only via link
FR-NEW-22: Epic 8 — Insight spese rule-based
FR-NEW-23: Epic 12 — Bookmark ricette con tag
FR-NEW-24: Epic 12 — Lista della spesa da ingredienti

## Epic List

### Epic 1: Trusted Data — Integration Health & Sync Reliability

Gli utenti capiscono a colpo d'occhio se i dati sono live o stale, e recuperano integrazioni rotte senza aiuto del developer. Il sistema garantisce sync atomico, refresh token automatico, e un pannello di salute dell'integrazione con percorso di recovery trasparente.
**FRs covered:** FR2, FR3, FR4, FR5, FR7, FR9, FR28, FR29

### Epic 2: Reliable Push Notifications & Reminders

Gli utenti ricevono notifiche push per i promemoria puntualmente anche con l'app chiusa, e gestiscono l'intero lifecycle del reminder (crea, completa, riapri, ricorrenza) direttamente dal widget home. Un fallback in-app è disponibile quando le notifiche push sono disabilitate.
**FRs covered:** FR19, FR20, FR21, FR34

### Epic 3: Actionable Home Dashboard

Gli utenti completano il morning loop (leggi → agisci → fatto) interamente dalla home in ≤60 secondi, senza navigare verso altre sezioni. I widget mostrano CTA contestuali quando vuoti e persistono i filtri/stati tra sessioni.
**FRs covered:** FR6, FR8, FR30, FR31

### Epic 4: Finance Integrity & Intelligence

Gli utenti gestiscono le proprie finanze con fiducia totale: zero transazioni duplicate durante l'import CSV, operazioni bulk, categorie bloccate manualmente, e insights di spesa client-side senza costi server.
**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR32, FR33

### Epic 5: Beta User Self-Onboarding & Profile Management

Nuovi utenti configurano autonomamente Strava e Linear tramite un wizard guidato con validazione real-time delle API key, e accedono immediatamente ai propri dati senza intervento del developer. Gli utenti esistenti gestiscono profilo e impostazioni di sicurezza.
**FRs covered:** FR1, FR22, FR23, FR24, FR26

### Epic 6: Advanced Fitness Analytics & Privacy Controls

Gli utenti accedono ad analisi avanzate della composizione corporea (BodyCanvas navigabile da tastiera, grafici peso/grasso/pliche), visualizzano attività Strava con corretto timezone locale, e controllano la visibilità dei dati sensibili con Privacy Mode.
**FRs covered:** FR15, FR16, FR17, FR18, FR25, FR27

### Epic 7: App Simplification — Remove Projects & Push Notifications

L'utente dispone di un'app più snella e affidabile, senza moduli rotti o non utilizzati. La rimozione del modulo Progetti (Kanban, Linear, KanbanColumnWidget) e dell'intero sistema Push Notifications riduce il surface area tecnico e migliora la stabilità generale.
**FRs covered:** FR-NEW-1, FR-NEW-2

### Epic 8: Enhanced Financial Planning

L'utente può pianificare obiettivi di risparmio in ordine di priorità e ricevere insight automatici sulle proprie spese — senza costi AI. Il saldo totale viene allocato in cascata sugli obiettivi ordinati, e insight rule-based segnalano anomalie di spesa in tempo reale.
**FRs covered:** FR-NEW-3, FR-NEW-4, FR-NEW-5, FR-NEW-6, FR-NEW-7, FR-NEW-22

### Epic 9: Weekly Life Review

Ogni lunedì, l'utente riceve automaticamente un resoconto visivo della settimana precedente (fitness, abitudini, finanze) in una modale non invasiva, senza dover navigare tra sezioni.
**FRs covered:** FR-NEW-8, FR-NEW-9

### Epic 10: Travel Planning Module

L'utente può pianificare viaggi completi — itinerari giornalieri drag & drop, ristoranti, attrazioni, alloggi, budget — e condividere il piano con altri in sola lettura tramite link pubblico, senza richiedere registrazione ai destinatari.
**FRs covered:** FR-NEW-10, FR-NEW-11, FR-NEW-12, FR-NEW-13, FR-NEW-14, FR-NEW-15, FR-NEW-16, FR-NEW-17

### Epic 11: Gift & Wishlist

L'utente può gestire una lista desideri personale con prodotti, link, prezzi e foto, organizzata per categoria o occasione, condivisibile via link pubblico per facilitare i regali.
**FRs covered:** FR-NEW-18, FR-NEW-19, FR-NEW-20, FR-NEW-21

### Epic 12: Recipe Collection (low priority)

L'utente può salvare link a ricette da qualsiasi fonte, organizzarle con tag personali e generare una lista della spesa dagli ingredienti. Nessun scraping — solo bookmarking.
**FRs covered:** FR-NEW-23, FR-NEW-24

---

## Epic 1: Trusted Data — Integration Health & Sync Reliability

Gli utenti capiscono a colpo d'occhio se i dati sono live o stale, recuperano integrazioni rotte in autonomia e il sistema garantisce sync atomico con rollback in caso di errore.

### Story 1.1: Sync Status Badge on Affected Widgets

As a user,
I want to see the sync status (live / stale) directly on the KanbanColumnWidget and LastActivityCard widgets,
So that I can immediately understand whether the displayed data is current without navigating to the Profile.

**Acceptance Criteria:**

**Given** the KanbanColumnWidget or LastActivityCard is rendered on the home dashboard
**When** the last successful sync occurred more than 30 minutes ago or the last sync returned an error
**Then** a SyncStatusBadge is displayed on the widget showing "Stale — last sync Xh ago" or an error icon
**And** when the data is fresh (synced within 30 minutes), the badge shows a green "Live" indicator or is hidden

**Given** an external API (Linear or Strava) is offline or returns an error during background sync
**When** the widget renders
**Then** a SyncStatusBadge with error state is visible on the affected widget
**And** the cached data is displayed normally without blocking the UI

---

### Story 1.2: Integration Health Section in Profile

As a user,
I want to see a dedicated Integration Health section in /profile with human-readable status and error logs for each integration (Strava, Linear),
So that I can diagnose sync failures without inspecting network logs or contacting the developer.

**Acceptance Criteria:**

**Given** I navigate to /profile and open the Integrations section
**When** an integration is functioning correctly
**Then** I see "Strava: Connected — Last sync: [timestamp]" and "Linear: Connected — Last sync: [timestamp]" in green

**Given** an integration has a sync error (e.g., 401 Unauthorized on Linear webhook)
**When** I view the Integration Health card for that service
**Then** I see a human-readable error message (e.g., "Linear Sync: Webhook 401 — Unauthorized") with the timestamp of the failure

**Given** the integration error card is displayed
**When** I look at the card
**Then** I can see the last 5 error log entries sorted by timestamp DESC

---

### Story 1.3: Force Reconciliation for Linear

As a user,
I want to trigger a "Force Reconciliation" from the Profile to fully re-sync Linear data,
So that I can resolve stale or mismatched data without waiting for the next webhook event.

**Acceptance Criteria:**

**Given** I am on the /profile Integration Health section for Linear
**When** I click "Force Reconciliation"
**Then** the button shows a loading state and the system fetches all Projects, States, and Issues from the Linear API

**Given** the reconciliation fetch completes successfully
**When** the sync finishes
**Then** the local Supabase cache is updated atomically (all-or-nothing) and a "Sync Successful" toast is shown
**And** the SyncStatusBadge on the KanbanColumnWidget updates to "Live"

**Given** the reconciliation fetch fails (e.g., invalid API key)
**When** the error is returned
**Then** a human-readable error message is shown inline and the local cache remains unchanged (no partial update)

---

### Story 1.4: Atomic Bidirectional Linear Sync via Kanban

As a user,
I want to drag a Linear issue to a new column in the Kanban board and have the state change persisted to Linear,
So that Ottoboard and Linear always reflect the same task state.

**Acceptance Criteria:**

**Given** I drag a task card from one column to another on the Kanban board
**When** the drop completes
**Then** the UI updates optimistically (task appears in new column immediately, no loading state visible)
**And** a PATCH request is sent to the Linear API to update the issue state in the background

**Given** the Linear API PATCH request fails
**When** the error is returned
**Then** the task card rolls back to its original column automatically
**And** a toast message "Operazione non riuscita, riprova" is shown to the user
**And** the local Supabase cache is NOT updated

**Given** a Linear webhook event arrives (issueUpdated)
**When** the Edge Function processes the webhook
**Then** the local Supabase cache is updated atomically for the affected issue
**And** React Query is invalidated via Supabase Realtime to refresh the Kanban UI without page reload

---

### Story 1.5: Automatic Strava Token Refresh

As a user,
I want the system to automatically refresh my Strava OAuth token before it expires,
So that my fitness data is always synced without manual re-authentication.

**Acceptance Criteria:**

**Given** a Strava access token is within 24 hours of expiration
**When** the scheduled Edge Function runs (nightly cron)
**Then** the token is refreshed using the stored refresh_token and the new access_token is saved encrypted to Supabase

**Given** the Strava token refresh call fails (e.g., refresh_token revoked)
**When** the error occurs
**Then** the error is logged in the integration health record for Strava
**And** on the next visit to /profile, the user sees "Strava: Re-authentication required" with a "Reconnect" CTA

**Given** the Strava token is valid and not near expiration
**When** the nightly cron runs
**Then** no refresh call is made (no unnecessary API requests)

---

### Story 1.6: Integration Token Expiration Warning Banners

As a user,
I want to see a UI warning when an integration token is nearing expiration (< 48h),
So that I can renew it proactively before losing access to synced data.

**Acceptance Criteria:**

**Given** a Strava or Linear token will expire within 48 hours
**When** I visit the home dashboard or /profile
**Then** a non-blocking banner is displayed: "[Integration] token expires in [X hours] — Renew now"
**And** the banner links directly to the relevant integration card in /profile

**Given** the token has already expired
**When** I visit the home dashboard
**Then** the banner shows "Strava/Linear: Connection lost — Re-authenticate" with a "Fix now" link
**And** the SyncStatusBadge on the affected widget shows an error state

**Given** the token is renewed successfully
**When** the renewal completes
**Then** the warning banner disappears from the home and profile pages

---

## Epic 2: Reliable Push Notifications & Reminders

Gli utenti ricevono notifiche push puntuali anche con l'app chiusa, e gestiscono l'intero lifecycle del reminder direttamente dal widget home.

### Story 2.1: Push Notification Permission & Subscription

As a user,
I want to be prompted to enable push notifications via a non-invasive banner on the home dashboard,
So that I can receive reminder notifications without navigating to the Profile settings.

**Acceptance Criteria:**

**Given** I have active reminders and have not yet granted push notification permission
**When** I open the home dashboard
**Then** a dismissible NotificationPermissionBanner appears: "Attiva notifiche per i promemoria → Attiva"

**Given** I click "Attiva" on the banner
**When** the browser permission dialog is shown and I grant permission
**Then** the browser subscription is created and saved to `push_subscriptions` in Supabase
**And** the banner disappears permanently

**Given** I dismiss the banner without granting permission
**When** I return to the home dashboard in a future session
**Then** the banner does NOT reappear (state persisted in localStorage)

**Given** the browser does not support Web Push API
**When** I visit the home dashboard
**Then** the NotificationPermissionBanner is not shown at all

---

### Story 2.2: Scheduled Push Notification Delivery

As a user,
I want to receive a push notification when a reminder is due (even with the app closed),
So that I never miss a scheduled reminder.

**Acceptance Criteria:**

**Given** a reminder has a `due_date` of today and a `due_time` set
**When** the Vercel Cron job runs at the top of each hour
**Then** reminders due within the next 60 minutes with `notified_at IS NULL` and `completed = false` are queried
**And** a push notification is sent to all active subscriptions for the user

**Given** the push notification is sent successfully
**When** the delivery is confirmed
**Then** `reminders.notified_at` is updated to `NOW()` to prevent duplicate sends

**Given** a reminder has `due_time = NULL`
**When** the cron runs at 9:00 AM on the `due_date`
**Then** the push notification is delivered at 9:00 AM local time

**Given** a push subscription returns a 410 Gone response
**When** the send is attempted
**Then** the subscription record is automatically deleted from `push_subscriptions`

---

### Story 2.3: Recurring Reminder Auto-Generation

As a user,
I want a new occurrence of a recurring reminder to be created automatically when I complete it,
So that I don't have to manually recreate recurring reminders each time.

**Acceptance Criteria:**

**Given** I mark a recurring reminder (daily/weekly/monthly/yearly) as complete
**When** the completion is saved
**Then** a new reminder is created with `completed = false`, `notified_at = NULL`, and `due_date` advanced by the recurrence interval
**And** all other fields (title, notes, priority, recurrence) are inherited from the original

**Given** the recurrence is `monthly` and the original `due_date` is the 31st
**When** the next month has fewer than 31 days
**Then** the new `due_date` is set to the last day of the next month (no invalid date)

**Given** I complete a non-recurring reminder
**When** the completion is saved
**Then** no new reminder is created

---

### Story 2.4: In-App Notification Center Fallback

As a user,
I want to see an in-app Notification Center on the home dashboard when push notifications are disabled,
So that I can still review and act on my reminders even without system-level push.

**Acceptance Criteria:**

**Given** push notifications are blocked or not supported by the browser
**When** I open the home dashboard
**Then** the RemindersWidget displays all due and upcoming reminders sorted by `due_date` ASC as the primary fallback

**Given** I have reminders due today or overdue
**When** I view the RemindersWidget
**Then** overdue reminders are visually distinguished (e.g., red date badge) from future ones

**Given** push is disabled and I have no reminders today
**When** I view the RemindersWidget
**Then** an empty state is shown: "Nessun promemoria in scadenza — [+ Aggiungi]" CTA

---

## Epic 3: Actionable Home Dashboard

Gli utenti completano il morning loop interamente dalla home in ≤60 secondi, senza navigare verso altre sezioni. I widget mostrano CTA contestuali quando vuoti e persistono i filtri tra sessioni.

### Story 3.1: Widget Empty States with Contextual CTAs

As a user,
I want every home widget in an empty or error state to show a contextual call-to-action,
So that I always know what to do next and never see a blank or broken widget.

**Acceptance Criteria:**

**Given** the KanbanColumnWidget has no tasks in the selected column
**When** the widget renders
**Then** an empty state is shown: module icon (purple) + "Nessun task in questa colonna" + "Apri Progetti →" link

**Given** the LastActivityCard has no Strava activities synced
**When** the widget renders
**Then** an empty state is shown: orange icon + "Nessun allenamento sincronizzato" + "Connetti Strava →" link to /profile

**Given** the MonthFinanceWidget has no transactions for the current month
**When** the widget renders
**Then** an empty state is shown: emerald icon + "Nessun movimento questo mese" + "Aggiungi transazione →" link

**Given** any widget is in a loading state
**When** data is being fetched
**Then** a skeleton loader (animate-pulse bg-white/5 rounded) is shown instead of a spinner or blank space

---

### Story 3.2: Direct Actions from Home Widgets

As a user,
I want to complete core actions (check off a reminder, mark a habit, drag a Linear task) directly from the home dashboard,
So that I can finish the morning loop without navigating to module pages.

**Acceptance Criteria:**

**Given** the RemindersWidget is on the home dashboard
**When** I tap the checkbox next to a reminder
**Then** the reminder is marked complete with an optimistic update (immediate visual feedback, no loading state)
**And** if the server mutation fails, the checkbox rolls back automatically with a toast error

**Given** the HabitsWidget is on the home dashboard and today is a scheduled day for a habit
**When** I tap the completion checkbox for a habit
**Then** the habit is toggled with an optimistic update
**And** the streak counter updates immediately

**Given** the KanbanColumnWidget is on the home dashboard
**When** I tap a task card
**Then** a task detail modal opens in-place (no navigation to /projects)

---

### Story 3.3: Dashboard Widget Customization (Add / Remove / Reorder)

As a user,
I want to add, remove, and reorder widgets on my home dashboard,
So that I can configure the morning loop to show only the information relevant to me.

**Acceptance Criteria:**

**Given** I am on the home dashboard
**When** I click "Aggiungi widget"
**Then** the AddWidgetModal opens showing all available widget types not already on the dashboard

**Given** I select a widget type in the AddWidgetModal
**When** I confirm
**Then** the widget is appended to the dashboard and saved to `dashboard_widgets` with the next available position

**Given** I hover over (desktop) or view (mobile) a widget's WidgetShell action bar
**When** I click "Rimuovi"
**Then** an inline confirm appears ("Rimuovi?" → "Conferma" / "Annulla") — no separate modal
**And** on confirm, the widget is removed from the dashboard and deleted from `dashboard_widgets`

**Given** I drag a widget by its handle to a new position
**When** I drop it
**Then** the new order is saved to `dashboard_widgets.position` and persists across sessions

---

### Story 3.4: Persist Widget Filters and View States

As a user,
I want my widget filter selections (e.g., which Kanban column to show, which Linear project) to persist between sessions,
So that I don't have to reconfigure the dashboard every time I open the app.

**Acceptance Criteria:**

**Given** I configure a KanbanColumnWidget to show a specific project and column
**When** I save the configuration
**Then** the `projectId` and `columnId` are stored in `dashboard_widgets.config` (JSONB)
**And** on next session the widget renders with the same project/column pre-selected

**Given** I reopen the app after a previous session
**When** the home dashboard loads
**Then** all widgets render with the last-used configuration without requiring re-setup

**Given** a saved widget references a project or column that has since been deleted
**When** the widget renders
**Then** the widget shows an empty state with a "Riconfigura widget" CTA instead of an error

---

## Epic 4: Finance Integrity & Intelligence

Gli utenti gestiscono le proprie finanze con fiducia totale: zero duplicati nell'import CSV, operazioni bulk, categorie bloccabili manualmente, insights di spesa client-side.

### Story 4.1: Manual Transaction Entry

As a user,
I want to manually record income and expense transactions with category, amount, and date,
So that I can track all my financial movements in one place.

**Acceptance Criteria:**

**Given** I open the transaction form in /finance
**When** I fill in amount (positive), type (income/expense), category, date, and optional description and click Save
**Then** the transaction is saved to the `transactions` table and appears immediately in the list (optimistic update)

**Given** I submit the form with a missing required field (amount, type, category, or date)
**When** the validation runs inline at the field level
**Then** an error message is shown at the specific field without submitting the form

**Given** I save a transaction successfully
**When** the mutation settles
**Then** the monthly header (total income, total expenses, balance) updates to reflect the new transaction

---

### Story 4.2: CSV Import with Automated Column Mapping

As a user,
I want to import financial transactions via CSV with automated column detection and a preview before confirming,
So that I can bulk-load data from my bank export without manual entry.

**Acceptance Criteria:**

**Given** I drag-and-drop or select a CSV file in the import UI
**When** the file is parsed
**Then** the system auto-detects columns for date, amount, and description, and shows a preview table of the first 10 rows

**Given** the auto-detected column mapping is incorrect
**When** I manually reassign columns via dropdown selectors
**Then** the preview table updates in real-time to reflect the new mapping

**Given** I confirm the import
**When** the transactions are saved
**Then** only non-duplicate rows are inserted (see Story 4.3 for dedup logic)
**And** a summary toast shows: "X transazioni importate, Y duplicate ignorate"

---

### Story 4.3: Duplicate Detection During CSV Import

As a user,
I want the system to automatically detect and flag potential duplicate transactions during CSV import,
So that I don't end up with the same transaction recorded twice.

**Acceptance Criteria:**

**Given** I am in the CSV import preview step
**When** the system compares incoming rows against existing `transactions`
**Then** rows matching on (date + amount + description) are flagged as "Probabile duplicato" in the preview table

**Given** a flagged duplicate is shown in the preview
**When** I review it
**Then** I can choose to include it anyway (override) or exclude it (default behavior)

**Given** I confirm the import with some duplicates excluded
**When** the import runs
**Then** excluded rows are skipped and the summary correctly reports the count of ignored duplicates

---

### Story 4.4: Monthly Budget Monitoring

As a user,
I want to define monthly spending budgets per expense category and see my progress against them,
So that I can control overspending before the month ends.

**Acceptance Criteria:**

**Given** I open the budget section in /finance
**When** I set a budget amount for a category and month
**Then** the budget is saved to `budgets` and a horizontal progress bar shows "speso / budget" for that category

**Given** spending in a category reaches 80% of the budget
**When** the BudgetTracker renders
**Then** the progress bar changes to amber color as a visual warning

**Given** spending in a category exceeds 100% of the budget
**When** the BudgetTracker renders
**Then** the progress bar turns red and shows the overspent amount

**Given** no budget is set for a category
**When** I view that category's spending
**Then** the category is displayed without a progress bar (no budget = no constraint shown)

---

### Story 4.5: Bulk Transaction Operations

As a user,
I want to select multiple transactions and delete or recategorize them in one action,
So that I can clean up or organize my transaction history efficiently.

**Acceptance Criteria:**

**Given** I am on the transaction list in /finance
**When** I enable multi-select mode (checkbox on each row appears)
**Then** I can select multiple transactions across the visible page

**Given** I have selected one or more transactions
**When** I click "Elimina selezionati"
**Then** an inline confirm appears; on confirm, all selected transactions are deleted and the list updates

**Given** I have selected one or more transactions
**When** I click "Cambia categoria" and select a new category
**Then** all selected transactions are updated to the new category in a single operation

**Given** I am in multi-select mode and deselect all items
**When** the selection count reaches zero
**Then** multi-select mode exits automatically

---

### Story 4.6: Lock Transaction Category

As a user,
I want to manually lock the category of a transaction so it is never auto-reassigned,
So that my manual categorization decisions are preserved during future imports or bulk operations.

**Acceptance Criteria:**

**Given** I open a transaction's edit modal
**When** I toggle "Blocca categoria"
**Then** the transaction is saved with `category_locked = true` and a lock icon is visible on the transaction row

**Given** a transaction has `category_locked = true`
**When** a bulk recategorize operation is applied to a selection that includes it
**Then** the locked transaction is skipped and a notice shows "X transazioni bloccate escluse"

**Given** I unlock a previously locked transaction
**When** I save the change
**Then** the lock icon disappears and the transaction is eligible for bulk recategorization again

---

### Story 4.7: Client-Side Spending Insights

As a user,
I want to see local insights on my spending trends (category breakdown, monthly comparison, budget alerts),
So that I can understand my financial patterns without any server-side processing cost.

**Acceptance Criteria:**

**Given** I have transactions for at least 2 months
**When** I view the finance page
**Then** a bar+line chart shows monthly income and expenses for the last 6 months, computed client-side

**Given** I view the spending pie chart
**When** transactions for the current month exist
**Then** the chart shows percentage breakdown by expense category, calculated in the browser

**Given** a category's spending exceeds its budget in the current month
**When** I view the finance dashboard
**Then** an alert indicator appears on that category's budget bar

---

## Epic 5: Beta User Self-Onboarding & Profile Management

Nuovi utenti configurano autonomamente Strava e Linear tramite un wizard guidato con validazione real-time, e accedono subito ai propri dati senza intervento del developer.

### Prerequisito Epic 5: Trigger Onboarding (Global Gate)

Per garantire che il wizard venga mostrato davvero al primo ingresso, Epic 5 include anche il gate globale di onboarding.

Regole richieste:

- Utente autenticato con onboarding non completato: qualsiasi route protetta deve redirectare a `/onboarding`
- Utente autenticato con onboarding completato: accesso normale alle route applicative
- Route escluse dal gate: `/auth/*`, `/api/*`, asset statici, `/onboarding`
- Completamento onboarding persistito in DB (es. `onboarding_completed_at` su profilo utente)

Note di integrazione stories:

- Story 5.1 copre trigger iniziale e primi step wizard
- Story 5.2 completa il wizard e marca onboarding come completato

### Story 5.1: Onboarding Wizard — Strava OAuth Connection

As a new user,
I want to connect my Strava account via OAuth during the onboarding wizard,
So that my fitness activities are synced immediately after setup without any developer intervention.

**Acceptance Criteria:**

**Given** I complete registration and land on /onboarding for the first time
**When** I reach the Strava connection step
**Then** a "Connetti Strava" button triggers the OAuth flow via `/api/strava/connect`
**And** on successful OAuth callback, a success indicator is shown and the wizard advances to the next step

**Given** I am authenticated and onboarding is not completed
**When** I open any protected app route (except `/onboarding`)
**Then** I am redirected to `/onboarding` by the global onboarding gate

**Given** the OAuth flow fails or I deny permissions on Strava
**When** I return to the wizard
**Then** the step shows an error with a "Riprova" button; I am not blocked from proceeding

**Given** I click "Salta" on the Strava step
**When** I complete the wizard
**Then** the fitness module shows an empty state with a "Connetti Strava" CTA — no broken charts

**Given** I connect Strava successfully
**When** the initial sync runs
**Then** the scope (full history vs. last 30 days) is configurable on the same step before confirming

---

### Story 5.2: Onboarding Wizard — Linear API Key Setup

As a new user,
I want to enter and validate my Linear API key during onboarding with real-time feedback,
So that my projects appear immediately after setup with no empty or broken states.

**Acceptance Criteria:**

**Given** I reach the Linear setup step in the wizard
**When** I type or paste an API key into the input field
**Then** the system validates the key in real-time (debounced 500ms) by calling the Linear API
**And** a green checkmark or inline error ("Chiave non valida") appears at the field level without submitting

**Given** the API key is valid
**When** I click "Salva e continua"
**Then** the key is encrypted and stored in Supabase, a team selector appears, and I can choose my Linear team

**Given** I click "Salta" on the Linear step
**When** I complete the wizard
**Then** the projects module shows the `LinearNotConnectedBanner` — no broken Kanban

**Given** the API key is saved and team selected
**When** the initial sync completes
**Then** the Kanban board in /projects is populated with real Linear data

**Given** I complete the final onboarding step (including Linear setup or explicit skip)
**When** I click the final continue action
**Then** the system persists onboarding completion in DB and the global onboarding gate no longer redirects me to `/onboarding`

---

### Story 5.3: Profile Security — Change Password

As a user,
I want to change my password from the /profile page,
So that I can maintain the security of my account without contacting an admin.

**Acceptance Criteria:**

**Given** I navigate to /profile → Security section
**When** I enter my current password, a new password, and confirm the new password and click Save
**Then** `supabase.auth.updateUser` is called and a "Password aggiornata" toast is shown on success

**Given** the new password and confirm password fields do not match
**When** I try to save
**Then** an inline error is shown at the confirm field without calling the API

**Given** the current password is incorrect
**When** Supabase returns an auth error
**Then** an inline error is shown: "Password attuale non corretta"

---

### Story 5.4: Data Isolation Verification (RLS)

As a user,
I want my data to be completely isolated from other users' data,
So that I can be confident that no other user can see or modify my transactions, activities, or tasks.

**Acceptance Criteria:**

**Given** I am authenticated as User A
**When** I query any Supabase table (transactions, activities, tasks, reminders, habits)
**Then** only rows where `user_id = auth.uid()` are returned (RLS enforced)

**Given** User B attempts to read or write a row owned by User A
**When** the Supabase client executes the query
**Then** the operation returns an empty result or 403 error — no data leak

**Given** any new table is created in the schema
**When** it stores user-owned data
**Then** it must have `user_id UUID NOT NULL DEFAULT auth.uid()` and a policy with `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`

---

## Epic 6: Advanced Fitness Analytics & Privacy Controls

Gli utenti accedono ad analisi avanzate della composizione corporea, visualizzano le attività Strava con timezone corretto, e controllano la visibilità dei dati sensibili con Privacy Mode.

### Story 6.1: Strava Activity Visualization with Correct Timezone

As a user,
I want my Strava activities and their dates to be displayed in my local timezone,
So that activities completed at midnight or late evening appear on the correct calendar day.

**Acceptance Criteria:**

**Given** a Strava activity has a `start_date` stored in UTC
**When** the activity is displayed in the ActivityHeatmap, ActivityList, or LastActivityCard
**Then** the date shown uses `toLocalDateStr()` (local year/month/day) — never `toISOString().slice(0,10)`

**Given** I am in a UTC+1 timezone (CET) and completed a run at 23:30 local time
**When** the activity appears in the heatmap
**Then** the cell for that local calendar day is highlighted — not the next day

**Given** I navigate the ActivityHeatmap year view
**When** I hover over a cell
**Then** the tooltip shows the date formatted in the local locale (e.g., "Lun 15 Gen 2026") with activity name

---

### Story 6.2: Body Measurement Recording

As a user,
I want to record a body measurement session (weight, skinfolds, circumferences) with all fields optional,
So that I can log only what I measured today without being forced to complete the entire form.

**Acceptance Criteria:**

**Given** I open the MeasurementForm in the /fitness Body tab
**When** I enter only weight and date (minimum valid entry) and save
**Then** a `body_measurements` row is created with only `weight_kg` populated and all other fields NULL

**Given** I enter a full set of skinfold measurements (JP3 or JP7 sites)
**When** I save the form
**Then** `body_fat_pct`, `fat_mass_kg`, and `lean_mass_kg` are calculated using the Jackson-Pollock formula and persisted

**Given** the user has no `user_body_profile` record (height, sex, birth_date)
**When** I attempt to save skinfold measurements
**Then** a prompt asks me to complete my body profile first; the form does not discard entered data

**Given** I save a measurement session
**When** it appears in the MeasurementHistoryTable
**Then** I can click any row to open it in edit mode and update values

---

### Story 6.3: Body Composition Charts

As a user,
I want to view charts of my weight, body fat percentage, and body composition over time,
So that I can track my progress visually across measurement sessions.

**Acceptance Criteria:**

**Given** I have at least 2 measurement sessions with `weight_kg` values
**When** I view the WeightChart
**Then** a line chart shows weight over time with a 7-day moving average overlay

**Given** I have at least 2 sessions with `body_fat_pct` calculated
**When** I view the BodyFatChart
**Then** reference bands are shown (atleta / forma / normale) as background regions on the chart

**Given** I have sessions with both `lean_mass_kg` and `fat_mass_kg`
**When** I view the BodyCompositionChart
**Then** a stacked area chart shows lean mass (orange) and fat mass (muted) stacked over time

**Given** a chart has sessions where a specific measurement is NULL
**When** the chart renders
**Then** only sessions where that measurement is present are plotted — no interpolation of missing values

---

### Story 6.4: Interactive BodyCanvas

As a user,
I want to interact with a visual body map (SVG) to see measurement values for each body zone on hover,
So that I can quickly identify which zones have been measured and how they compare to the previous session.

**Acceptance Criteria:**

**Given** I view the BodyCanvas in the /fitness Body tab
**When** I hover over or tap a body zone (e.g., waist, arm, chest)
**Then** a tooltip shows the current value, the date of the last measurement, and the delta vs. the previous session

**Given** a body zone has no measurement in the most recent session
**When** I hover over it
**Then** the tooltip shows "Nessun dato" — the zone is rendered in a muted/inactive color

**Given** I click the "Posteriore" toggle
**When** the view switches
**Then** the SVG shows the posterior view with relevant zones (subscapular, tricep, calf, etc.)

**Given** I am on a keyboard (desktop)
**When** I tab through the body zones
**Then** each zone receives a visible focus ring and the tooltip activates on focus

---

### Story 6.5: Privacy Mode — Blur Sensitive Data

As a user,
I want to toggle a Privacy Mode that blurs all sensitive numerical values (balances, amounts, body metrics),
So that I can use the app in public without exposing personal financial or health data.

**Acceptance Criteria:**

**Given** I am on any page with sensitive data (finance balances, body weight, activity stats)
**When** I toggle "Privacy Mode" from the home dashboard or profile
**Then** all numerical values are immediately blurred without a page reload

**Given** Privacy Mode is active
**When** I navigate between pages
**Then** the blur persists across all modules until I toggle it off

**Given** I toggle Privacy Mode off
**When** the toggle is activated
**Then** all values are immediately revealed without a page reload

**Given** I close and reopen the app with Privacy Mode active
**When** the app loads
**Then** Privacy Mode state is restored from localStorage (persists across sessions)

---

## Epic 7: App Simplification — Remove Projects & Push Notifications

L'utente dispone di un'app più snella e affidabile, senza moduli rotti o non utilizzati.

### Story 7.1: Remove Projects Module

As a developer maintaining Ottoboard,
I want to remove the entire Projects module from the codebase,
So that the app is leaner, has no broken routes, and no dead code referencing Linear.

**Acceptance Criteria:**

**Given** the app is running
**When** I navigate to `/projects`
**Then** the route does not exist (404 or redirect to home)
**And** the sidebar/bottom nav has no "Progetti" entry

**Given** the home dashboard widget list
**When** a user tries to add a widget
**Then** `kanban-column` type is not offered
**And** any existing `kanban-column` widgets in `dashboard_widgets` are removed via migration

**Given** the database
**When** the cleanup migration runs
**Then** tables `projects`, `columns`, `tasks` are dropped
**And** columns `linear_project_id`, `linear_team_id`, `linear_state_id`, `linear_issue_id` etc. are gone
**And** `user_integrations` rows with `service = 'linear'` are deleted

**Given** the Profile page
**When** the user visits `/profile`
**Then** no Linear integration card is visible
**And** no Linear API key field or team selector exists

---

### Story 7.2: Remove Push Notifications System

As a developer maintaining Ottoboard,
I want to remove the entire push notifications subsystem,
So that there is no dead service worker code, no unused DB table, and no broken permission UI.

**Acceptance Criteria:**

**Given** the custom service worker
**When** the app loads
**Then** no `push` event handler is registered
**And** no `notificationclick` handler is registered

**Given** the database
**When** the cleanup migration runs
**Then** table `push_subscriptions` is dropped
**And** column `notified_at` is removed from `reminders`

**Given** the home dashboard
**When** the user has reminder widgets active
**Then** no `NotificationPermissionBanner` is rendered anywhere

**Given** the Profile page
**When** the user visits `/profile`
**Then** no "Notifiche" section exists
**And** `useNotificationPermission` hook is deleted from codebase

**Given** Vercel configuration
**When** reviewing `vercel.json` and environment variables
**Then** any push-notification cron config is removed
**And** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` vars are no longer referenced in code

---

## Epic 8: Enhanced Financial Planning

L'utente pianifica obiettivi di risparmio in cascata e riceve insight automatici sulle spese senza costi AI.

### Story 8.1: Savings Goals — Data Model & CRUD

As a user,
I want to create, edit, and delete savings goals with a name and target amount,
So that I can define what I'm saving for.

**Acceptance Criteria:**

**Given** the Finance page
**When** I navigate to a new "Goals" section/tab
**Then** I see a list of my savings goals (empty state if none)
**And** a "+ Nuovo Obiettivo" button is visible

**Given** the goal creation form
**When** I enter a name and target amount and save
**Then** the goal appears in the list
**And** is persisted in a new `savings_goals` table with RLS (`user_id DEFAULT auth.uid()`)

**Given** an existing goal
**When** I click edit and change name or amount
**Then** the change is saved immediately (optimistic update)

**Given** an existing goal
**When** I click delete and confirm
**Then** the goal is removed from list and DB

---

### Story 8.2: Savings Goals — Waterfall Allocation & Progress

As a user,
I want to see how my total balance is automatically distributed across my savings goals in priority order,
So that I know which goals are funded and how far along each one is.

**Acceptance Criteria:**

**Given** a total balance (from existing `transactions` data) and a list of ordered goals
**When** the Goals section renders
**Then** the system allocates the balance to goals sequentially: goal 1 fills first, surplus flows to goal 2, etc.
**And** each goal shows a progress bar with amount allocated / target amount
**And** goals show one of three states: "Raggiunto" (100%), "In corso" (partially funded), "Non avviato" (0%)

**Given** the balance changes (new transaction added)
**When** the Goals section re-renders
**Then** allocations are recalculated automatically (client-side, React Query derived state)

**Given** a goal with target €1000 and balance of €600 total
**When** goal 1 has target €500 and goal 2 has target €800
**Then** goal 1 shows €500 / €500 (Raggiunto), goal 2 shows €100 / €800 (In corso)

---

### Story 8.3: Savings Goals — Manual Reordering

As a user,
I want to drag & drop savings goals to change their priority order,
So that I control which goal gets funded first.

**Acceptance Criteria:**

**Given** a list of savings goals
**When** I drag a goal to a new position
**Then** the order updates immediately (optimistic update)
**And** the new `position` values are persisted to DB via individual `update()` calls (not upsert)
**And** the waterfall allocation recalculates based on the new order

**Given** a failed DB update during reorder
**When** the Supabase call returns an error
**Then** the list rolls back to the previous order visually

---

### Story 8.4: Finance Rule-Based Spending Insights

As a user,
I want to see automatic insights about my spending patterns,
So that I can identify anomalies without manually analyzing my transactions.

**Acceptance Criteria:**

**Given** at least 3 months of transaction history
**When** I open the Finance module
**Then** an "Insights" card displays rule-based alerts, e.g.:
- "La categoria X è aumentata del Y% rispetto alla media degli ultimi 3 mesi"
- "Hai superato il budget della categoria X di €Y"
- "Il tuo giorno più costoso è tipicamente il venerdì"

**Given** insufficient data (< 1 month of history)
**When** the insights card renders
**Then** it shows "Aggiungi più transazioni per sbloccare gli insight" (no crash, no empty card)

**Given** all calculations
**When** insights are computed
**Then** all logic runs client-side in the browser (no API call, no Edge Function, zero server cost)

---

## Epic 9: Weekly Life Review

Ogni lunedì l'utente riceve automaticamente un resoconto della settimana precedente in una modale non invasiva.

### Story 9.1: Weekly Review Modal

As a user,
I want to see a weekly summary modal on Monday mornings when I open Ottoboard,
So that I can start the week with a clear picture of what happened the previous week.

**Acceptance Criteria:**

**Given** it is Monday and the user opens Ottoboard for the first time that day
**When** the home page mounts
**Then** a modal opens automatically showing the previous week's summary:
- **Fitness:** n° sessioni, km totali, calorie totali, minuti totali
- **Abitudini:** % completamento per ogni abitudine schedolata nella settimana
- **Finanze:** entrate totali, uscite totali, categoria con più spesa, delta uscite vs settimana precedente

**Given** the modal is open
**When** the user clicks "Chiudi" or outside the modal
**Then** the modal closes and a flag is saved (`localStorage` key: `last_weekly_review_shown: YYYY-MM-DD`) with the current Monday's date

**Given** the flag is already set to the current Monday's date
**When** the user opens Ottoboard again the same day (or later in the week)
**Then** the modal does NOT reopen

**Given** it is any day other than Monday
**When** the home page mounts
**Then** the modal is never triggered

**Given** insufficient data for a section (e.g. no activities logged last week)
**When** the modal renders that section
**Then** it shows a friendly empty state ("Nessun allenamento la settimana scorsa") without crashing

---

## Epic 10: Travel Planning Module

L'utente pianifica viaggi completi con itinerario drag & drop e condivisione pubblica via link.

### Story 10.1: Trip Creation & Management

As a user,
I want to create, edit, and delete trips with destination, dates, and notes,
So that I have a dedicated space for each of my travels.

**Acceptance Criteria:**

**Given** a new `/travel` route in the app
**When** I navigate to it
**Then** I see a list of my trips (empty state if none)
**And** the sidebar/bottom nav has a "Viaggi" entry with `amber` color theme

**Given** the trip creation form
**When** I enter destination, start date, end date, and optional notes
**Then** the trip is saved to a new `trips` table (RLS: `user_id DEFAULT auth.uid()`)
**And** appears in the trips list

**Given** an existing trip
**When** I click on it
**Then** I navigate to the trip detail page `/travel/[id]`

**Given** an existing trip
**When** I delete it
**Then** all associated data (days, cards, accommodations) is cascade-deleted

---

### Story 10.2: Restaurants, Attractions & Accommodations

As a user,
I want to save restaurants, attractions, and accommodation links for a trip,
So that I have all my research organized in one place.

**Acceptance Criteria:**

**Given** a trip detail page
**When** I open the "Ristoranti" section
**Then** I can add entries with name and Google Maps link
**And** entries are saved to `trip_places` table with `type: 'restaurant' | 'attraction'`

**Given** the "Attrazioni" section
**When** I add an attraction
**Then** it has name and link fields, saved with `type: 'attraction'`

**Given** the "Alloggi" section
**When** I add an accommodation
**Then** I can save a URL (Booking, Airbnb, etc.) with an optional label
**And** the link opens in a new tab

**Given** any saved place
**When** I delete it
**Then** it is removed from both UI and DB (optimistic update + rollback on error)

---

### Story 10.3: Day Itinerary with Drag & Drop

As a user,
I want to build a day-by-day itinerary by dragging restaurants and attractions into time slots,
So that I can plan each day of my trip visually.

**Acceptance Criteria:**

**Given** a trip detail page with at least one saved place
**When** I open the "Itinerario" section
**Then** I see a day-by-day layout (one column per trip day)
**And** each day has 6 fixed time slots: Colazione / Mattina / Pranzo / Pomeriggio / Cena / Sera

**Given** the itinerary view
**When** I drag a place card into a time slot
**Then** the card is placed in that slot and the assignment is persisted to `trip_itinerary_items` table

**Given** a placed card
**When** I drag it to a different slot or day
**Then** the assignment updates (optimistic update)

**Given** a placed card
**When** I remove it from the slot
**Then** it returns to the unassigned places pool

---

### Story 10.4: Trip Expense Summary

As a user,
I want to see a summary of my trip expenses,
So that I know the total cost of the trip at a glance.

**Acceptance Criteria:**

**Given** a trip detail page
**When** I open the "Budget" section
**Then** I see a list of expense entries I can add manually (description, amount, category: transport/accommodation/food/attractions/other)

**Given** one or more expense entries
**When** the budget section renders
**Then** it shows the total sum and a breakdown by category

**Given** no expense entries
**When** the budget section renders
**Then** it shows a friendly empty state with a "+ Aggiungi spesa" CTA

---

### Story 10.5: Itinerary Export & Public Sharing

As a user,
I want to export my itinerary and share it as a read-only public link,
So that travel companions can view the plan without needing an Ottoboard account.

**Acceptance Criteria:**

**Given** a trip detail page
**When** I click "Esporta"
**Then** I can download the itinerary as a JSON file containing all trip data

**Given** a downloaded JSON file
**When** I use "Importa" on a new trip
**Then** the trip is recreated with all places, itinerary assignments, and notes

**Given** a trip detail page
**When** I click "Condividi"
**Then** a unique public URL is generated: `/travel/[uuid]/public`
**And** the URL is copyable to clipboard

**Given** a visitor opens `/travel/[uuid]/public`
**When** the page loads (no auth required)
**Then** they see the full read-only itinerary: days, slots, places, accommodations
**And** no edit controls are visible
**And** the page is accessible without a Supabase session (public RLS policy on `trips` where `is_public = true`)

---

## Epic 11: Gift & Wishlist

L'utente gestisce una lista desideri personale condivisibile via link pubblico.

### Story 11.1: Wishlist Item CRUD

As a user,
I want to add, edit, and delete items in my wishlist with name, link, price, and photo,
So that I have a single place to track what I want to buy or receive as a gift.

**Acceptance Criteria:**

**Given** a new `/wishlist` route
**When** I navigate to it
**Then** I see my wishlist items (empty state if none)
**And** a "+ Aggiungi" button is visible

**Given** the item creation form
**When** I enter name (required), and optionally link, price, and photo URL
**Then** the item is saved to a new `wishlist_items` table (RLS: `user_id DEFAULT auth.uid()`)
**And** appears in the list with photo thumbnail if provided

**Given** an existing item
**When** I click its status badge
**Then** I can cycle through: "Desiderato" → "Ricevuto" → "Acquistato"
**And** the status change is persisted immediately (optimistic update)

**Given** an existing item
**When** I delete it with inline confirm
**Then** it is removed from UI and DB

---

### Story 11.2: Wishlist Organization & Public Sharing

As a user,
I want to organize my wishlist by category or occasion and share it publicly,
So that friends and family can easily see what to gift me without needing an account.

**Acceptance Criteria:**

**Given** the wishlist page
**When** I add or edit an item
**Then** I can assign an optional category/occasion label (free text or predefined: Compleanno, Natale, Generale, ecc.)

**Given** the wishlist page
**When** I filter by category
**Then** only items matching that category are shown

**Given** the wishlist page
**When** I click "Condividi lista"
**Then** a unique public URL is generated: `/wishlist/[uuid]/public`
**And** the URL is copyable to clipboard

**Given** a visitor opens `/wishlist/[uuid]/public`
**When** the page loads (no auth required)
**Then** they see all items with name, photo, price (if set), and status
**And** "Acquistato" and "Ricevuto" items are visually distinct (strikethrough o badge)
**And** no edit or delete controls are visible
**And** the page works without a Supabase session (public RLS policy where `is_public = true`)

---

## Epic 12: Recipe Collection

L'utente salva link a ricette da qualsiasi fonte con tag e genera liste della spesa. (Priorità: bassa)

### Story 12.1: Recipe Bookmark CRUD

As a user,
I want to save recipe links with title, photo, and personal tags,
So that I have a curated collection of recipes I want to try, organized by my criteria.

**Acceptance Criteria:**

**Given** a new `/recipes` route
**When** I navigate to it
**Then** I see my saved recipes in a grid/list (empty state if none)
**And** a "+ Salva Ricetta" button is visible

**Given** the recipe creation form
**When** I enter a URL (required) plus optional title, photo URL, and tags
**Then** the recipe is saved to a new `recipes` table (RLS: `user_id DEFAULT auth.uid()`)
**And** appears in the collection with photo thumbnail if provided

**Given** the recipe collection
**When** I filter by tag
**Then** only recipes with that tag are shown

**Given** an existing recipe
**When** I click its link
**Then** it opens in a new tab

**Given** an existing recipe
**When** I delete it with inline confirm
**Then** it is removed from UI and DB

---

### Story 12.2: Shopping List from Recipe Ingredients

As a user,
I want to manually enter ingredients for a recipe and generate a shopping list,
So that I can quickly know what to buy before cooking.

**Acceptance Criteria:**

**Given** a recipe detail page
**When** I open the "Ingredienti" section
**Then** I can add ingredients as free-text lines (name + optional quantity)

**Given** one or more recipes with saved ingredients
**When** I select multiple recipes and click "Genera lista della spesa"
**Then** a shopping list is generated aggregating all ingredients from selected recipes

**Given** the shopping list view
**When** I check off an ingredient
**Then** it is marked as "acquistato" (strikethrough) — state persisted in localStorage (no DB needed)

**Given** the shopping list
**When** I click "Copia lista"
**Then** the plain-text list is copied to clipboard
