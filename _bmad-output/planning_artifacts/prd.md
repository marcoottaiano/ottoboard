---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
inputDocuments: ['CLAUDE.md', 'README.md', 'package.json', 'Doc/personal_dashboard_PRD.docx']
workflowType: 'prd'
lastEdited: '2026-03-26'
editHistory:
  - date: '2026-03-26'
    changes: 'Added Travel Planning module (Phase 13) — FR35–FR50, Journey 4, Product Scope Vision update, Project Scoping Phase 3 expansion, Executive Summary update'
documentCounts:
  briefCount: 1
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 2
classification:
  projectType: Web App (PWA) / Integration-First Hub
  domain: Personal Dashboard (Fintech + Health + Productivity)
  complexity: Medium/High (Data Sync Focus)
  projectContext: Brownfield (Stabilization & Integration Fixes)
  keyStrategicFocus:
    - Data Reconciliation Strategy (Linear-Supabase Sync)
    - Read-Only Fallback Resilience
    - Integration Health Monitoring (Sync Logs)
---

# Product Requirements Document - ottoboard

**Author:** Marco
**Date:** 2026-03-19

## 1. Executive Summary

Ottoboard è un "Centro di Controllo" personale e modulare progettato per eliminare la frammentazione digitale consolidando fitness, finanze e produttività in un'unica interfaccia PWA self-hosted. Il prodotto risolve il problema dello "switch cost" traplici applicazioni proprietarie, offrendo un'esperienza su misura che garantisce la proprietà totale dei dati e l'assenza di modelli a abbonamento. Sebbene nasca per uso personale, l'architettura è aperta a utenti che cercano una dashboard unificata e priva di distrazioni commerciali.

### What Makes This Special

L'unicità di Ottoboard risiede nella sua natura di "Integration-First Hub": la capacità di far coesistere dati di performance atletica (Strava), gestione finanziaria custom e flussi di lavoro professionali (Linear) in un unico ambiente operativo. A differenza delle dashboard generiche, Ottoboard permette l'azione diretta (es. gestione task Linear) e il monitoraggio della salute in tempo reale, eliminando la necessità di navigare in ecosistemi chiusi e separati. L'espansione verso moduli di lifestyle personale — come il Travel Planning con itinerari condivisibili — consolida Ottoboard come unico punto di controllo per la vita digitale dell'utente.

## 2. Project Classification

*   **Project Type:** Web App (PWA) / Integration-First Hub
*   **Domain:** Personal Dashboard (Fintech + Health + Productivity)
*   **Complexity:** Medium/High (Data Sync Focus)
*   **Project Context:** Brownfield (Stabilization & Integration Fixes)
*   **Key Strategic Focus:** 
    *   Data Reconciliation Strategy (Linear-Supabase Sync)
    *   Read-Only Fallback Resilience
    *   Integration Health Monitoring (Sync Logs)

## 3. Success Criteria

### User Success
* **Total Data Trust:** Users must have absolute confidence that data shown (especially Linear tasks and Finance totals) is accurate and synchronized.
* **Frictionless Interaction:** Core actions (adding an expense, checking fitness stats) must be achievable in under 3 clicks from the home dashboard.
* **Instant Availability:** The dashboard must feel "alive" and ready, with perceived load times under 2 seconds.

### Business/Personal Success
* **Daily Utility:** The primary success metric is the owner's daily active usage (DAU) of the platform to manage their life.
* **Community Readiness:** The system is stable enough to be opened to a small group of beta users (10+) without manual intervention from the developer.
* **Subscription Independence:** Zero reliance on paid third-party dashboard services, achieving total self-hosted autonomy.

### Technical Success
* **Atomic Synchronization:** 100% consistency between Linear API and Supabase local cache, with robust conflict resolution logic.
* **PWA Resilience:** Seamless offline fallback for cached data and reliable "Add to Home Screen" (A2HS) installation on mobile devices.
* **Proactive Monitoring:** An automated health-check system for OAuth tokens (Strava/Linear) that alerts the user before integrations fail.

### Measurable Outcomes
* **Sync Accuracy:** Zero reported data mismatches between Linear and Ottoboard over a 30-day period.
* **Performance:** Lighthouse performance score > 90 for the main dashboard.
* **Uptime:** 99.9% availability of the self-hosted instance on Vercel/Supabase.

## 4. Product Scope

### MVP - Minimum Viable Product (Stabilization Phase)
* **Linear Sync Fix (Phase 10):** Reliable bidirectional synchronization with Linear Projects and Issues.
* **Push Notifications (Phase 11):** Functional PWA reminders for tasks and financial deadlines.
* **Core Modules:** Fully operational Fitness (Strava), Finance (Manual/CSV), and Profile management.

### Growth Features (Post-MVP)
* **Advanced Fitness Analytics:** Refined charts for body composition and trend analysis (Phase 9 completion).
* **Enhanced Customization:** Drag-and-drop widget resizing and advanced layout saving.
* **Multi-User Onboarding:** Streamlined flow for new users to connect their own Strava/Linear instances.

### Vision (Future)
* **Travel Planning Module (Phase 13):** Full trip planning suite — places, accommodations, transports, day-by-day itinerary with drag-and-drop scheduling, cost estimate, PDF export, and shareable public read-only links.
* **Expanded Ecosystem:** Integration of new modules such as Nutrition (MyFitnessPal-like) or Smart Home (Home Assistant).
* **Intelligence Layer:** AI-driven insights summarizing spending patterns or fitness recovery states.
* **Full Multi-Tenancy:** A robust multi-user platform with isolated environments for a broader audience.

## 5. User Journeys

### Journey 1: Marco — "The Morning Control Center" (Primary Success Path)
*   **Opening Scene:** Marco wakes up and opens Ottoboard on his smartphone (PWA). His goal is to get a 360-degree view of his day without app-switching.
*   **Rising Action:** He checks the Finance widget (synced balances) and views yesterday's run automatically pulled from Strava. He then glances at the Linear widget on the home dashboard.
*   **Climax:** Marco identifies a high-priority task in the "To Do" column and drags it to "In Progress" directly within Ottoboard. At the same time, a Push Notification reminds him to log his weekly body weight.
*   **Resolution:** Within 60 seconds, Marco has organized his professional tasks and acknowledged his fitness goals. The "switch cost" is eliminated, and he starts his day with total mental clarity.

### Journey 2: Marco — "The Integration Safety Net" (Edge Case & Recovery)
*   **Opening Scene:** Marco notices that a task he closed on the Linear web app is still showing as "Open" on Ottoboard. He feels a moment of "data distrust."
*   **Rising Action:** Instead of guessing, he navigates to the **Integration Health** section in his Profile. He sees a clear status indicator: *“Linear Sync: Delayed (Webhook 401 - Unauthorized).”*
*   **Climax:** Marco realizes his API key might have expired. He pastes a new key into the field and clicks **"Force Reconciliation."**
*   **Resolution:** The system validates the key in real-time, the task status updates instantly, and a "Sync Successful" toast appears. Marco's trust is restored because the system was transparent about the failure and provided a clear path to fix it.

### Journey 3: The "Beta" User — "The Zero-Friction Welcome" (Onboarding)
*   **Opening Scene:** A friend of Marco’s (a fellow developer/athlete) gets access to a fresh instance of Ottoboard. They need to connect their own data streams.
*   **Rising Action:** Upon first login, they are greeted by a **Setup Wizard**. They connect Strava via OAuth and are prompted to enter their Linear API Key with a helpful "How to find this" tooltip.
*   **Climax:** As soon as the keys are saved, the "Progetti" and "Fitness" tabs populate with their real data. There are no empty states or broken charts.
*   **Resolution:** The user perceives Ottoboard as a professional-grade tool. The complexity of the backend (Supabase/Edge Functions) is completely hidden behind a seamless onboarding experience.

### Journey 4: Marco — "The Trip Planner" (Travel Planning Module)
*   **Opening Scene:** Marco is planning a 5-day trip to Barcelona with two friends. He opens Ottoboard's Travel module to organize everything in one place instead of juggling Notes, Google Sheets, and browser tabs.
*   **Rising Action:** He creates a new trip ("Barcelona"), sets the dates and participant count (3), and uploads a cover photo. He adds restaurants and attractions by pasting Google Maps links — coordinates are parsed automatically and displayed on a Leaflet map preview. He adds one accommodation with check-in/check-out dates; its cost is immediately reflected in the cost estimate.
*   **Climax:** Marco switches to the Itinerary tab. He drags "Sagrada Família" into the "Mattina" slot of Day 2, and "El Xampanyet" bar into the "Sera" slot. The accommodation check-in event appears automatically on Day 1. When he finishes, he clicks "Genera Percorso" — Ottoboard builds a Google Maps Directions URL with all itinerary waypoints, which he opens in one tap. He exports the itinerary as a compact PDF and shares the trip link with his two friends via a single URL, no account required.
*   **Resolution:** Marco and his friends have a synchronized, centralized trip plan accessible from any device. The "switch cost" between planning tools is eliminated — Ottoboard becomes the single source of truth for the trip.

### Journey Requirements Summary
*   **Synchronization Engine:** Must support "Force Reconciliation" to bypass webhook delays and ensure 100% data integrity.
*   **Health Monitoring:** A dedicated UI section for tracking the status of external integrations (Strava/Linear) with human-readable error logs.
*   **PWA Push Engine:** A reliable service worker implementation for scheduled and immediate notifications (Reminders/Weight logging).
*   **Onboarding Wizard:** A guided first-run experience that validates API credentials before allowing the user into the main dashboard.

## 6. Domain-Specific Requirements

### Financial Data Integrity (Fintech)
* **Atomic Transactions:** Calculations for total balances and category budgets must use high-precision decimals to prevent rounding errors over time.
* **Deduplication Logic:** The CSV import engine must utilize a multi-field matching strategy (date, amount, description) to identify and prevent duplicate transaction entries.

### Health & Performance (Fitness)
* **OAuth Security:** Strava tokens and Linear API keys are persisted in the database with RLS (Row Level Security) ensuring isolation between users.
* **Scientific Calculation Validity:** Body composition metrics must adhere to validated physiological protocols (Jackson-Pollock 3/7-site skinfold) and remain consistent across historical records.

### Integration Resilience (Productivity Hub)
* **"Read-Only" Fail-Safe:** When external APIs (Linear/Strava) are offline or return errors, the dashboard must display the last successfully cached data with a clear "Stale Data" visual indicator.
* **Transparent Sync Health:** The system must proactively notify the user via UI toasts or profile status indicators if a background synchronization fails (e.g., due to expired API credentials).

## 7. Innovation & Novel Patterns (Zero-Cost Focus)

### Local Finance Intelligence
* **Client-Side Insights Engine:** Implementation of analysis logic interamente client-side (Zero-Cost). Use Web Workers to process financial trends, detect spending anomalies, and predict end-of-month balances directly in the browser without server costs.
* **On-Device Pattern Recognition:** Use simple statistical algorithms in JavaScript to categorize recurring expenses and suggest budget adjustments based on local historical data.

### Edge-Driven Automation
* **Strategic Free-Tier Usage:** Optimized use of Supabase Edge Functions for atomic data reconciliation and PWA push triggers, staying strictly within free-tier limits (500k invocations/month).
* **Service Worker Resilience:** Leveraging the PWA Service Worker to schedule smart reminders and cache critical UI states, reducing redundant server requests.

### Validation & Mitigation
* **Performance Checks:** Ensure that local data processing does not impact UI responsiveness on low-end mobile devices.
* **Circuit Breakers:** Implement hard-limits for Edge Function calls to guarantee zero maintenance costs for the developer.

## 8. Web App (PWA) Specific Requirements

### Project-Type Overview
Ottoboard è un'applicazione Single Page Application (SPA) costruita su Next.js 14 (App Router) e ottimizzata come Progressive Web App (PWA) for dispositivi moderni. L'obiettivo tecnico è minimizzare la latenza percepita e massimizzare la fluidità della dashboard attraverso l'uso di React Query e Supabase Realtime.

### Technical Architecture Considerations
*   **Rendering Strategy:** Approccio **SPA-like** prevalente per garantire transizioni istantanee tra i moduli (Fitness, Finance, Projects) dopo il caricamento iniziale.
*   **Real-time Data Sync:** Integrazione di **Supabase Realtime** per la sincronizzazione istantanea dello stato dei task e delle notifiche. Questo garantisce che modifiche fatte su Linear (ricevute via Webhook) si riflettano nella UI di Ottoboard senza ricaricare la pagina.
*   **Browser Matrix:** Supporto esclusivo per **Browser Moderni** (Evergreen browsers: Chrome, Safari 16.4+, Firefox, Edge) per sfruttare appieno le Web Push API, CSS Container Queries e le capacità di calcolo locale dei Web Workers.

### Implementation Considerations
*   **Accessibility (A11y):** Focus primario sulla **navigabilità da tastiera** (focus management, scorciatoie per i widget) per migliorare la velocità operativa dell'utente esperto. Il supporto agli screen reader non è considerato un requisito prioritario per questa fase.
*   **PWA Installability:** Mantenimento dei criteri di installabilità PWA (Web Manifest, Service Worker) con un focus sulla gestione della cache offline per i dati core.
*   **Performance Targets:** Lighthouse Performance Score > 90. Perceived Load Time (PLT) per i widget critici < 1.5 secondi tramite optimistic updates e caching aggressivo.

## 9. Project Scoping & Phased Development

### MVP Strategy & Philosophy
**MVP Approach:** *Stability & Reliability MVP (Brownfield Optimization)*. Il successo dell'MVP è definito dalla fiducia totale dell'utente nel dato sincronizzato e dalla robustezza della PWA installata.
**Resource Requirements:** Single Developer (Marco) con focus su Debugging (Linear/Service Workers) e ottimizzazione logiche client-side.

### MVP Feature Set (Phase 1: Stabilization & Fixes)
**Core User Journeys Supported:**
* "The Morning Control Center" (Successo sync dati Linear/Strava).
* "The Integration Safety Net" (Debug trasparente integrazioni).

**Must-Have Capabilities:**
* **Linear Reconciliation Engine:** Fix sincronizzazione bidirezionale Projects/Issues.
* **Push Notification Service:** Debug del Service Worker PWA per i Reminders.
* **Integration Health Dashboard:** UI nel profilo con log di errore leggibili per i token API.
* **Finance Consistency:** Validazione transazioni e import CSV senza duplicati.

### Post-MVP Features (Phase 2 & 3)
**Phase 2 (Growth & Refinement):**
* **Body Measurements Interactivity:** Raffinamento del `BodyCanvas` SVG per navigazione full-keyboard.
* **Habits Optimization:** Gestione avanzata delle serie (streaks) e widget home reattivo al 100%.
* **Beta Onboarding:** Wizard di setup per permettere ad altri utenti di collegare le proprie API key.

**Phase 3 (Expansion & Zero-Cost Vision):**
* **Travel Planning Module (Phase 13):** Full trip planning suite with places, accommodations, transports, drag-and-drop itinerary, cost estimate, PDF export, Google Maps route generation, and public shareable links.
* **Local Finance Intelligence:** Motore di analisi statistica client-side (Zero-Cost) per previsioni di spesa e alert budget.

### Risk Mitigation Strategy
* **Technical Risks:** Complessità della bidirezionalità Linear. *Mitigazione:* Implementare un sistema di riconciliazione manuale ("Force Sync") per evitare conflitti atomici.
* **Resource Risks:** Tempo di sviluppo limitato. *Mitigazione:* Blocco totale di nuove feature fino a quando i bug critici di Linear e Push non sono risolti.

## 10. Functional Requirements

### Integration Management & Sync
*   **FR1:** The user can connect external accounts (Strava, Linear) via a dedicated settings interface.
*   **FR2:** The system can perform a bidirectional sync with Linear Projects and Issues.
*   **FR3:** The user can trigger a manual "Force Reconciliation" to align local cache with external API states.
*   **FR4:** The system can detect and display human-readable status/error logs for each external integration.
*   **FR5:** The system can automatically refresh expired OAuth tokens in the background.
*   **FR26:** The user can configure the scope of the initial Strava sync (full history vs. last 30 days).
*   **FR28:** The system can ensure atomic database operations during synchronization to prevent data corruption.
*   **FR29:** The system can notify the user via UI banners if an integration token is nearing expiration.

### Home Dashboard & Widgets
*   **FR6:** The user can customize the home dashboard by adding, removing, or reordering functional widgets.
*   **FR7:** The system can display real-time updates for synced Linear tasks within the dashboard widgets.
*   **FR8:** The user can take direct actions (e.g., mark task as complete) from dashboard widgets.
*   **FR9:** The system can provide visual feedback (toasts/bars) during background sync operations.
*   **FR25:** The user can toggle a "Privacy Mode" to blur or hide sensitive numerical data.
*   **FR30:** The system can display contextual "Call to Action" guides in widgets when no data is available.
*   **FR31:** The system can persist user-defined filters and view states for each dashboard widget.

### Financial Management
*   **FR10:** The user can manually record income and expense transactions (Euro only).
*   **FR11:** The user can import financial data via CSV files with automated column mapping.
*   **FR12:** The system can identify and flag potentially duplicate transactions during CSV import.
*   **FR13:** The user can define and monitor monthly budgets for specific expense categories.
*   **FR14:** The system can provide local (client-side) insights on spending trends and budget alerts.
*   **FR32:** The user can perform bulk operations (delete, categorize) on multiple transactions simultaneously.
*   **FR33:** The user can manually override and "lock" the category of a transaction.

### Fitness & Health
*   **FR15:** The system can visualize athletic activities synced from Strava (volume, pace, heart rate trends).
*   **FR16:** The user can record body measurements (weight, skinfolds, circumferences).
*   **FR17:** The system can calculate body composition using validated formulas (Jackson-Pollock).
*   **FR18:** The user can interact with a visual map (BodyCanvas) to update specific measurement zones.
*   **FR27:** The system can display activities and reminders adjusted to the user's local timezone.

### Notifications & Reminders
*   **FR19:** The system can schedule and deliver push notifications for reminders even when the app is closed.
*   **FR20:** The user can manage notification permissions and settings.
*   **FR21:** The user can create and manage recurring reminders.
*   **FR34:** The system can display an in-app "Notification Center" if system push notifications are disabled.

### User Administration
*   **FR22:** The system can isolate user data using a secure multi-tenant architecture (RLS).
*   **FR23:** The user can manage their personal profile and security settings.
*   **FR24:** The system can provide an onboarding flow for new users to configure core modules.

### Travel Planning

*   **FR35:** The user can create, edit, and delete trips with name, cover photo (uploaded to Supabase Storage), status (bozza / pianificato / in_corso / completato), start/end dates, and participant count.
*   **FR36:** The user can activate or revoke a permanent public share link per trip; revocation immediately invalidates all existing links for that trip.
*   **FR37:** The system renders a read-only public view of a trip at `/shared/[token]`, returning 404 when the token is absent or revoked.
*   **FR38:** The user can add, edit, and delete places (ristorante / bar / attrazione) within a trip, providing name, type, optional description, optional price per person, and a Google Maps URL.
*   **FR39:** On place save, the system parses the Google Maps URL to extract latitude/longitude coordinates; when parsing fails, the user can enter coordinates manually (both fields optional — the Maps link remains functional regardless).
*   **FR40:** The user can filter places by free-text search and category type, and sort the list by price per person.
*   **FR41:** The user can add multiple accommodations per trip; the system prevents saving an accommodation whose check-in/check-out dates overlap with any existing accommodation.
*   **FR42:** Each accommodation has an "Include in cost estimate" toggle (default ON); the system prevents enabling two accommodations with overlapping dates simultaneously, displaying an inline error identifying the conflicting entry.
*   **FR43:** Accommodations automatically inject non-editable check-in and check-out events into the itinerary on the corresponding calendar days.
*   **FR44:** The user can add transport entries categorized as outbound or local, with name, optional description, price amount, and a price-type toggle (per person / total).
*   **FR45:** The user can build a day-by-day itinerary by dragging places into time slots (colazione / mattina / pranzo / pomeriggio / cena / sera); the itinerary tab is enabled only when both start and end dates are set on the trip.
*   **FR46:** When trip dates are extended, the system adds empty days; when trip dates are shortened, the system displays a confirmation modal listing items that will be deleted before proceeding.
*   **FR47:** The user can optionally assign an exact time to each itinerary item; the field is not required and does not affect slot assignment.
*   **FR48:** The system displays a read-only cost estimate aggregating: accommodations with "Include in cost estimate" ON (sum of total prices), attractions with a defined price (price per person × participants), and transports (per-person price × participants, or total price as-is); restaurants and bars are excluded from the estimate.
*   **FR49:** The user can export the itinerary as a PDF in two formats: "Compact" (day-by-day agenda with time slots and place names only) or "Complete" (agenda + places list + accommodations + transports + cost estimate).
*   **FR50:** The system generates a Google Maps Directions URL ordered chronologically from itinerary places that have coordinates; the "Generate Route" button is visible only when ≥ 2 places with coordinates are present in the itinerary.

## 11. Non-Functional Requirements

### Performance
* **Response Time:** All local UI interactions (modal openings, filter toggles) must feel instantaneous (< 100ms).
* **Data Load:** Initial dashboard load with cached data must occur in < 1.5 seconds on 4G/5G networks.
* **Background Sync:** Synchronization with external APIs (Linear/Strava) must not block the main UI thread.

### Security & Privacy
* **Data Isolation:** Each user must have exclusive access to their data via Supabase Row Level Security (RLS).
* **Credential Encryption:** All API keys and OAuth tokens must be encrypted at rest within the database.
* **Privacy Mode:** The system must support immediate obfuscation of sensitive data for use in public environments.

### Reliability & Integration
* **Atomic Sync:** Synchronization operations must be atomic; in case of failure, the system must either rollback or flag the data as "incomplete" to prevent inconsistent states.
* **Integration Resilience:** Core dashboard data (cached) must remain available even when external Linear or Strava APIs are offline.
* **Token Health:** The system must automatically refresh Strava tokens before expiration in 99% of cases.

### Accessibility
* **Keyboard First:** All critical actions (logging transactions, completing tasks) must be fully executable via keyboard shortcuts and tab navigation.
