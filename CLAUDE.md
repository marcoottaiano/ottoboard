# Personal Life Dashboard — PRD v1.1

> Dashboard personale e modulare per centralizzare dati di fitness, finanze e progetti.
> Self-hosted, no abbonamenti, architettura modulare con Next.js + Supabase.

---

## Tech Stack

### Frontend

| Tecnologia             | Versione        | Ruolo                                  |
| ---------------------- | --------------- | -------------------------------------- |
| Next.js                | 14 (App Router) | Framework principale, routing, SSR/SSG |
| TypeScript             | 5.x strict      | Type safety su tutto il progetto       |
| Tailwind CSS           | 3.x             | Styling, design system, dark mode      |
| Recharts               | 2.x             | Grafici (line, bar, pie, area)         |
| React Query (TanStack) | 5.x             | Data fetching, caching, sync stato     |
| Zustand                | 4.x             | State management leggero (UI state)    |
| dnd-kit                | latest          | Drag & drop per Kanban e widget home   |

### Backend & Infrastruttura

| Tecnologia              | Ruolo                                        |
| ----------------------- | -------------------------------------------- |
| Supabase (Free tier)    | Database PostgreSQL, Auth, Storage           |
| Supabase Edge Functions | OAuth flow Strava, sync dati esterni         |
| Supabase RLS            | Row Level Security — dati isolati per utente |
| Vercel (Free/Hobby)     | Deploy Next.js, env variables                |

### API Esterne

| Servizio | Auth      | Note                                          |
| -------- | --------- | --------------------------------------------- |
| Strava   | OAuth 2.0 | Fetch attività e stats atleta (100 req/15min) |
| Linear   | API Key   | Sync bidirezionale progetti/issue (Fase 10)   |

---

## Struttura Cartelle

```
src/
├── app/
│   ├── page.tsx                # Home — widget dashboard configurabile
│   ├── fitness/page.tsx        # Modulo allenamento
│   ├── finance/page.tsx        # Modulo finanze
│   ├── projects/page.tsx       # Modulo progetti (kanban)
│   └── profile/page.tsx        # Profilo utente + integrazioni (Fase 6)
├── components/
│   ├── ui/                     # Componenti base (Button, Card, Select, GlobalLoadingBar...)
│   ├── fitness/                # LastActivityCard, WeekStatsCard, WeeklyVolumeChart, ActivityHeatmap...
│   ├── finance/                # MonthlyHeader, TransactionForm, SpendingPieChart...
│   ├── projects/               # KanbanBoard, TaskCard, ProjectSidebar, MobileProjectBar...
│   └── home/                   # WidgetShell, AddWidgetModal, MonthFinanceWidget, TotalBalanceWidget, KanbanColumnWidget...
├── hooks/                      # Custom hooks per ogni modulo
├── lib/
│   ├── supabase/               # Client, types generati
│   └── strava/                 # API client + tipi
└── types/                      # Tipi TypeScript globali
```

---

## Autenticazione

Supabase Auth — email/password o magic link. RLS attivo su **tutte** le tabelle.

```sql
-- Policy da replicare su tutte le tabelle user-owned
CREATE POLICY "Users can only see their own data"
ON <table>
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);  -- WITH CHECK obbligatorio per INSERT/UPDATE

-- IMPORTANTE: la colonna user_id deve avere DEFAULT per evitare 403 su INSERT client-side
ALTER TABLE <table> ALTER COLUMN user_id SET DEFAULT auth.uid();
```

---

## Modulo 1 — Fitness (Strava)

### Flusso OAuth & Sync

- OAuth 2.0 via Supabase Edge Function → token salvati su Supabase (encrypted)
- Refresh token automatico schedulato ogni notte via Edge Function
- Sync incrementale: solo nuove attività, non si ri-fetcha tutto
- Tipi tracciati: `Run`, `WeightTraining`, `Walk`, `Hike`, `Ski`

### Schema: `activities`

```sql
id                BIGINT PRIMARY KEY     -- Strava ID
user_id           UUID NOT NULL          -- FK → auth.users (RLS)
type              TEXT NOT NULL          -- Run, WeightTraining, Walk...
name              TEXT NOT NULL
start_date        TIMESTAMPTZ NOT NULL
distance          FLOAT                  -- Metri (null per palestra)
moving_time       INT NOT NULL           -- Secondi
elapsed_time      INT NOT NULL           -- Secondi
average_heartrate FLOAT                  -- BPM medi
max_heartrate     FLOAT                  -- BPM massimi
average_pace      FLOAT                  -- min/km calcolato
calories          INT
kudos_count       INT
map_polyline      TEXT                   -- Encoded polyline (non mostrata in UI)
raw_data          JSONB                  -- Dati originali Strava completi
```

### UI — Componenti implementati

**Hero Section:**

- `LastActivityCard` — nome, tipo (badge colorato), data, durata, distanza (2 decimali), FC media/max, pace, calorie. Nessuna mappa. Prop `bare` per uso dentro `WidgetShell`.
- `WeekStatsCard` — n° allenamenti, km (2 decimali), durata ("X h X min"), calorie, delta vs settimana precedente. Prop `bare`.

**Grafici (Recharts):**

| Grafico            | Tipo             | Dettaglio                                                              |
| ------------------ | ---------------- | ---------------------------------------------------------------------- |
| Volume Settimanale | Bar Chart        | Ore/km per settimana, ultime 12 settimane. Filtro per tipo sport.      |
| Pace Trend         | Line Chart       | Pace medio per uscita (solo Run). Trendline + filtro periodo.          |
| Frequenza Cardiaca | Area Chart       | FC media nel tempo. Ultime 30 attività.                                |
| Heatmap Attività   | Calendar Heatmap | Griglia anno tipo GitHub. Arancione = allenamento, intensità = durata. |

**ActivityHeatmap — note tecniche:**

- Navigazione anno (←/→), celle future trasparenti al 25%
- Tooltip custom con data formattata (es. "Lun 15 Gen 2026") + nome attività
- **IMPORTANTE:** usare `toLocalDateStr()` (non `toISOString()`) per evitare sfasamento UTC (+1h in CET)
- **IMPORTANTE:** `overflow-x: auto` forza implicitamente `overflow-y: auto` (CSS spec) → aggiungere sempre `overflow-y-hidden`
- Labels mesi posizionate **dentro** la colonna della settimana (non con `position: absolute` + calcolo px) — garantisce allineamento strutturale

**Lista attività:** tabella paginata (20/pagina), filtri per tipo/periodo/distanza, click → modal dettaglio, link diretto a Strava.

---

## Modulo 2 — Finanze

Modulo completamente owned — nessuna API esterna. Inserimento manuale + import CSV.

### Schema: `transactions`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id      UUID NOT NULL DEFAULT auth.uid()          -- FK → auth.users (RLS)
amount       DECIMAL(10,2) NOT NULL                    -- Sempre positivo
type         ENUM('income', 'expense') NOT NULL
category_id  UUID NOT NULL                             -- FK → categories
description  TEXT
date         DATE NOT NULL
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Schema: `categories`

```sql
id     UUID PRIMARY KEY DEFAULT gen_random_uuid()
name   TEXT NOT NULL
icon   TEXT                                         -- Emoji o nome icona Lucide
color  TEXT                                         -- Hex color per grafici
type   ENUM('income', 'expense', 'both') NOT NULL
```

### Schema: `budgets`

```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
category_id  UUID NOT NULL
amount       DECIMAL(10,2) NOT NULL
month        DATE NOT NULL                           -- Primo giorno del mese
```

### UI — Componenti

**`TotalBalanceWidget`** — saldo storico totale (tutte le transazioni): entrate − uscite, breakdown con barra proporzionale. Usato sia in `/finance` (con card wrapper) che in home (`bare` = no wrapper).

**Header mensile:** saldo mensile (entrate−uscite), entrate/uscite totali affiancati, delta vs mese precedente, selector mese.

**Grafici:** Pie/Donut spese categoria, Bar+Line andamento mensile, Horizontal bar budget vs speso.

**Import CSV:** drag & drop, mapping colonne, preview, deduplicazione automatica.

---

## Modulo 3 — Progetti (Kanban)

Struttura: `Project → Columns → Tasks`. Drag & drop con dnd-kit.

### Schema: `projects` / `columns` / `tasks`

Invariato rispetto al design originale. `tasks.position` usa fractional indexing.

### UI — Note tecniche DnD

- `useSortable` → task cards dentro ogni colonna
- `useDraggable + useDroppable` → spostamento tra colonne e riordino colonne
- **CRITICO:** `useReorderColumns` usa UPDATE individuale per ogni colonna (NON `upsert`) — l'upsert con campi parziali sovrascrive i campi non passati con NULL
- Optimistic update → rollback automatico se mutation Supabase fallisce
- `TouchSensor` con `{ delay: 200, tolerance: 8 }` per mobile

### Mobile UX

- `ProjectSidebar` nascosta su mobile (`hidden md:flex`)
- `MobileProjectBar` in alto su mobile: selector progetto + pulsante nuovo progetto

---

## Modulo 4 — Home Dashboard (Fase 5 — ✅ Completata)

Dashboard configurabile: l'utente sceglie quali widget mostrare, quanti e in che ordine.

### Schema: `dashboard_widgets`

```sql
id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id   UUID NOT NULL DEFAULT auth.uid()
type      TEXT NOT NULL   -- 'last-activity' | 'week-stats' | 'month-finance' | 'total-balance' | 'kanban-column'
position  INT NOT NULL    -- ordinamento
config    JSONB           -- { projectId, columnId } per kanban-column
```

### Widget disponibili

| Tipo            | Componente           | Link sezione |
| --------------- | -------------------- | ------------ |
| `last-activity` | `LastActivityCard`   | `/fitness`   |
| `week-stats`    | `WeekStatsCard`      | `/fitness`   |
| `month-finance` | `MonthFinanceWidget` | `/finance`   |
| `total-balance` | `TotalBalanceWidget` | `/finance`   |
| `kanban-column` | `KanbanColumnWidget` | `/projects`  |

### Pattern `bare`

I componenti fitness (`LastActivityCard`, `WeekStatsCard`) e `TotalBalanceWidget` hanno prop `bare?: boolean`. Quando `bare=true` (usato dentro `WidgetShell`) l'outer card wrapper viene rimosso per evitare il doppio sfondo.

### WidgetShell

Wrapper DnD per ogni widget: drag handle, "Vai alla sezione", configura (solo kanban-column), rimuovi con confirm inline. Action bar visibile su hover desktop, sempre visibile su mobile.

### GlobalLoadingBar

`src/components/ui/GlobalLoadingBar.tsx` — barra animata in cima alla viewport quando `useIsFetching() > 0`. Montata in `app/layout.tsx` dentro `<Providers>`.

---

## Layout & Shell

### Navigazione

- Sidebar fissa a sinistra su desktop (collassabile a icone)
- Bottom navigation su mobile
- Routes: `/` (home), `/fitness`, `/finance`, `/projects`, `/profile` (Fase 6)

### Theme

- Dark mode by default (toggle disponibile)
- Colore per modulo: `orange` fitness / `green` finance / `purple` projects
- Font: Geist (incluso in Next.js 14)

---

## Gotcha Tecnici & Pattern Appresi

### Supabase RLS

- Le policy di INSERT richiedono `WITH CHECK (auth.uid() = user_id)` oltre a `USING`
- Se `user_id` non ha `DEFAULT auth.uid()`, l'INSERT client-side passa `user_id = null` → RLS 403
- `upsert` con subset di campi sovrascrive i campi non passati con NULL → usare `update()` individuale

### Date & Timezone

- Non usare `date.toISOString().slice(0, 10)` per date locali — in UTC+1, mezzanotte locale = 23:00 UTC del giorno prima → la data risulta sfasata di -1 giorno
- Usare sempre `toLocalDateStr(date)` (anno/mese/giorno locali con `getFullYear()`, `getMonth()`, `getDate()`)

### CSS Overflow

- `overflow-x: auto` su un elemento imposta implicitamente `overflow-y: auto` (CSS spec) → scroll verticale indesiderato. Risolvere con `overflow-y-hidden` esplicito.

### Select con dropdown

- Il componente `Select` ha prop `dropUp?: boolean` — usarlo quando la select è vicino al fondo dello schermo (apre il menu verso l'alto con `bottom-full mb-1`)
- Non mettere `overflow-hidden` su container che contengono `Select` — il dropdown viene tagliato

### Allineamento griglia calendario

- Posizionare le label di intestazione colonna **dentro** la stessa colonna strutturale (non con `position: absolute` + calcolo pixel) — il layout si allinea automaticamente e non dipende da valori hardcoded

---

## Roadmap

| Fase        | Modulo               | Stato | Deliverable                                                                                                       |
| ----------- | -------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| **Fase 1**  | Setup                | ✅    | Scaffolding Next.js, Supabase, Auth, layout shell                                                                 |
| **Fase 2**  | Fitness              | ✅    | OAuth Strava, sync attività, grafici, lista, heatmap                                                              |
| **Fase 3**  | Finanze              | ✅    | Schema DB, form inserimento, grafici, import CSV, budget                                                          |
| **Fase 4**  | Progetti             | ✅    | Kanban board, drag & drop, task modal, mobile UX                                                                  |
| **Fase 5**  | Home                 | ✅    | Widget dashboard configurabile, DnD reorder, add/remove widget                                                    |
| **Fase 6**  | Profilo              | ✅    | Pagina profilo: cambio password, gestione integrazione Strava multi-utente                                        |
| **Fase 7**  | Auth                 | ✅    | Registrazione, reset password, onboarding nuovo utente, test multi-account                                        |
| **Fase 8**  | PWA                  | ✅    | App installabile: manifest, service worker, icone, offline fallback                                               |
| **Fase 9**  | Misurazioni corporee | 🔜    | Tab misurazioni in /fitness: peso, plicometrie, circonferenze, composizione corporea, grafici, canvas interattivo |
| **Fase 10** | Linear + Reminders   | 🔜    | Sync bidirezionale Linear in /projects, setup integrazione in /profile, widget Reminders in home                  |

---

## Fase 6 — Profilo & Strava Multi-Utente

### Obiettivo

Pagina `/profile` che permetta di:

1. Cambiare password
2. Vedere e gestire la connessione Strava
3. Permettere a nuovi utenti di collegare il proprio account Strava

### Strava Multi-Utente — Architettura

Strava usa OAuth standard: si registra **una sola app Strava** (del developer), le credenziali (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) stanno in env vars server-side. Ogni utente autentica il proprio account Strava tramite quella app → riceve il proprio `access_token` + `refresh_token` → salvati per `user_id` in Supabase.

```
Utente A → OAuth → App Strava (condivisa) → token A → activities user A
Utente B → OAuth → App Strava (condivisa) → token B → activities user B
```

Limiti da considerare: 100 req/15min **per app** (condiviso tra tutti gli utenti), 1000 req/giorno per utente.

### UI — Componenti Fase 6

- `ProfilePage` — layout a sezioni: info account, sicurezza, integrazioni
- `ChangePasswordForm` — vecchia password + nuova (con conferma), via `supabase.auth.updateUser`
- `StravaIntegrationCard` — stato connessione, ultima sync, pulsante "Connetti"/"Disconnetti", trigger sync manuale

---

## Fase 7 — Auth Completa

### Obiettivo

Rendere l'app usabile da chiunque senza intervento del developer.

### Funzionalità

- **Registrazione** — form email + password, validazione, welcome email via Supabase
- **Reset password** — flow "Forgot password" → email → link → nuova password
- **Login page** — tab Login / Registrati
- **Onboarding** — primo accesso: wizard che guida setup categorie finanza + connessione Strava
- **Test multi-account** — verificare isolamento dati tra utenti diversi (RLS), nessun leak

---

## Fase 8 — PWA (Progressive Web App)

### Obiettivo

Rendere Ottoboard installabile come app nativa su mobile e desktop, con supporto offline.

### Funzionalità

- **Web App Manifest** — icona, nome, theme color, display standalone
- **Service Worker** — cache asset statici, offline fallback page
- **Icone** — 192×192 e 512×512 da logo ufficiale, apple-touch-icon per iOS
- **Install prompt** — Chrome/Safari mostrano banner "Aggiungi alla schermata home"

### Architettura

- `@ducanh2912/next-pwa` (Workbox) — genera SW automaticamente al build
- `public/manifest.json` — Web App Manifest
- `public/icons/` — icone PNG in varie dimensioni
- `src/app/offline/page.tsx` — pagina fallback quando offline e route non cachata
- `next.config.mjs` — wrappato con `withPWA(...)`

### Note tecniche

- SW disabilitato in `NODE_ENV=development` per evitare interferenze
- `public/sw.js` e `public/workbox-*.js` generati al build → aggiunti a `.gitignore`
- Icone con `purpose: "any"` (non maskable — logo ha già bordi arrotondati)
- `theme_color: "#1a5f6b"` corrisponde al colore di sfondo del logo

---

## Fase 9 — Misurazioni Corporee

### Obiettivo

Aggiungere una seconda tab alla pagina `/fitness` dedicata al monitoraggio della composizione corporea: peso, plicometrie, circonferenze, massa grassa e massa magra calcolate. Nessun BMI.

### Struttura pagina

`/fitness` diventa a due tab:

- **Tab 1 — Strava**: contenuto attuale (LastActivityCard, WeekStatsCard, grafici, lista attività)
- **Tab 2 — Corpo**: misurazioni corporee, grafici composizione, canvas interattivo

### Schema: `body_measurements`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL DEFAULT auth.uid()
measured_at   DATE NOT NULL

-- Peso
weight_kg     FLOAT

-- Plicometrie (mm) — protocollo Jackson-Pollock
skinfold_chest        FLOAT   -- petto (JP7 / JP3 uomo)
skinfold_abdomen      FLOAT   -- addome (JP7 / JP3 uomo)
skinfold_thigh        FLOAT   -- coscia (JP7 / JP3 uomo + donna)
skinfold_tricep       FLOAT   -- tricipite (JP7 / JP3 donna)
skinfold_suprailiac   FLOAT   -- soprailiaca (JP7 / JP3 donna)
skinfold_subscapular  FLOAT   -- sottoscapolare (JP7)
skinfold_midaxillary  FLOAT   -- ascellare mediana (JP7)

-- Circonferenze (cm)
circ_waist      FLOAT
circ_hip        FLOAT
circ_chest      FLOAT
circ_arm        FLOAT   -- bicipite contratto
circ_forearm    FLOAT
circ_thigh      FLOAT
circ_calf       FLOAT
circ_neck       FLOAT

-- Calcolati e persistiti
body_fat_pct  FLOAT   -- % grasso da formula JP
fat_mass_kg   FLOAT   -- peso × body_fat_pct / 100
lean_mass_kg  FLOAT   -- peso - fat_mass_kg

created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Schema: `user_body_profile`

```sql
-- Dati statici per i calcoli (inseriti in onboarding)
user_id    UUID PRIMARY KEY
height_cm  FLOAT NOT NULL
sex        TEXT NOT NULL   -- 'male' | 'female'
birth_date DATE NOT NULL   -- serve per calcolare età nelle formule JP
```

### Formule — Jackson-Pollock

**JP 3 pliche — Uomo** (petto + addome + coscia):

```
density = 1.10938 - (0.0008267 × Σ3) + (0.0000016 × Σ3²) - (0.0002574 × età)
```

**JP 3 pliche — Donna** (tricipite + soprailiaca + coscia):

```
density = 1.0994921 - (0.0009929 × Σ3) + (0.0000023 × Σ3²) - (0.0001392 × età)
```

**JP 7 pliche** (tutti e 7 i siti):

- Uomo: `density = 1.112 - (0.00043499 × Σ7) + (0.00000055 × Σ7²) - (0.00028826 × età)`
- Donna: `density = 1.097 - (0.00046971 × Σ7) + (0.00000056 × Σ7²) - (0.00012828 × età)`

**Equazione di Siri** (density → % grasso):

```
% grasso = (495 / density) - 450
```

### Grafici

| #   | Grafico               | Tipo            | Dati                                                      |
| --- | --------------------- | --------------- | --------------------------------------------------------- |
| 1   | Peso nel tempo        | Line chart      | `weight_kg` + media mobile 7gg                            |
| 2   | Composizione corporea | Stacked area    | `lean_mass_kg` + `fat_mass_kg` in kg                      |
| 3   | % Grasso nel tempo    | Line chart      | `body_fat_pct` + fasce riferimento (atleta/forma/normale) |
| 4   | Radar circonferenze   | Radar/Spider    | Tutte le circonferenze — sovrapponi 2 date                |
| 5   | Variazione misure     | Bar orizzontale | Delta dalla prima misurazione (verde = miglioramento)     |
| 6   | Somma pliche          | Line chart      | Σ pliche nel tempo + toggle per singolo sito              |

### Canvas interattivo — BodyCanvas

Componente SVG React con figura stilizzata (anteriore + posteriore). Ogni regione è un path SVG cliccabile/hoverable mappato a una misura:

```
Zona SVG        →  Misura
──────────────────────────
braccio-sx/dx   →  circ_arm
avambraccio     →  circ_forearm
petto           →  circ_chest / skinfold_chest
addome          →  circ_waist / skinfold_abdomen
fianchi         →  circ_hip
coscia          →  circ_thigh / skinfold_thigh
polpaccio       →  circ_calf
collo           →  circ_neck
tricipite       →  skinfold_tricep
soprailiaca     →  skinfold_suprailiac
```

Al hover: tooltip con valore attuale, data ultima misurazione e delta rispetto alla sessione precedente.
Implementazione: SVG nativo + React `onMouseEnter/Leave` + Tooltip component esistente. Vista anteriore di default, toggle per vista posteriore.

### UI — Componenti

- `FitnessPage` — aggiunta gestione tab con stato (`'strava' | 'body'`)
- `BodyMeasurementsTab` — container tab corpo, layout grafici + canvas
- `MeasurementForm` — form inserimento sessione (tutti i campi opzionali tranne data)
- `BodyCanvas` — SVG interattivo omino anteriore/posteriore
- `BodyCompositionChart` — stacked area massa magra/grassa (grafico 2)
- `WeightChart` — line chart peso + media mobile (grafico 1)
- `BodyFatChart` — line chart % grasso con fasce (grafico 3)
- `CircumferencesRadarChart` — radar chart circonferenze (grafico 4)
- `MeasurementsDeltaChart` — bar orizzontale variazioni (grafico 5)
- `SkinfoldsTrendChart` — line chart pliche nel tempo (grafico 6)
- `MeasurementHistoryTable` — tabella sessioni passate, click → dettaglio/modifica

### Note tecniche

- Tutti i campi del form sono opzionali: l'utente può inserire solo peso, solo circonferenze, solo pliche, o qualsiasi combinazione
- Il calcolo JP richiede almeno i 3 siti del protocollo scelto (JP3 o JP7) + `user_body_profile` compilato → altrimenti `body_fat_pct` = null
- `user_body_profile` va inserito in onboarding o al primo accesso alla tab Corpo
- I grafici mostrano solo le sessioni in cui quella specifica misura è presente (no interpolazione)
- Il grafico radar normalizza i valori su scala 0–100 per rendere comparabili misure diverse (cm)

---

## Fase 10 — Linear Integration + Widget Reminders

### Obiettivo

1. Sostituire il Kanban interno di `/projects` con una vista sincronizzata bidirezionalmente su Linear (progetti e issue)
2. Aggiungere la configurazione dell'integrazione Linear nella pagina `/profile`
3. Aggiungere un nuovo widget **Reminders** nella home dashboard, gestibile interamente dal widget stesso

---

### Modulo Projects — Integrazione Linear

#### Architettura

- L'utente inserisce la propria **Linear API Key** in `/profile` → salvata cifrata in Supabase (come i token Strava)
- I **Linear Projects** corrispondono 1:1 ai progetti in Ottoboard
- Le **Linear States** di ogni team corrispondono alle colonne del Kanban
- La sincronizzazione è **bidirezionale**:
  - Drag & drop in Ottoboard → `PATCH /issues/:id` su Linear API
  - Webhook Linear `issueUpdated` / `issueCreated` / `issueRemoved` → aggiorna vista in Ottoboard via revalidation React Query

#### Migrazione dati

- Le tabelle `projects`, `columns`, `tasks` vengono svuotate (`TRUNCATE`) — i dati esistenti sono sostituiti dai dati Linear
- Le tabelle esistenti vengono **riutilizzate come cache locale** dei dati Linear, aggiungendo le colonne di mapping:

```sql
ALTER TABLE projects ADD COLUMN linear_project_id TEXT UNIQUE;
ALTER TABLE projects ADD COLUMN linear_team_id    TEXT;

ALTER TABLE columns  ADD COLUMN linear_state_id   TEXT UNIQUE;
ALTER TABLE columns  ADD COLUMN linear_state_color TEXT;  -- colore hex da Linear

ALTER TABLE tasks    ADD COLUMN linear_issue_id    TEXT UNIQUE;
ALTER TABLE tasks    ADD COLUMN linear_issue_url   TEXT;  -- link diretto Linear
ALTER TABLE tasks    ADD COLUMN linear_identifier  TEXT;  -- es. "ENG-42"
ALTER TABLE tasks    ADD COLUMN priority           INT;   -- 0=none 1=urgent 2=high 3=medium 4=low
ALTER TABLE tasks    ADD COLUMN assignee_name      TEXT;
ALTER TABLE tasks    ADD COLUMN assignee_avatar    TEXT;
```

#### Flusso sync

```
Apertura /projects
  → fetch Linear API: projects + states + issues (team selezionato)
  → upsert cache locale su Supabase
  → render Kanban da cache

Drag & drop issue (cambio stato)
  → optimistic update UI
  → PATCH Linear API issue state
  → on error: rollback UI

Webhook Linear → Supabase Edge Function
  → aggiorna cache locale
  → React Query invalidation via Supabase Realtime
```

#### Rate limit Linear

- Linear API: 1.500 req/ora per API key → nessun problema per uso personale
- Webhook: no limite, push-based

#### UI — Componenti aggiornati/nuovi

- `ProjectsPage` — gestione stato connessione Linear (se non configurata: banner prompt setup)
- `KanbanBoard` — colonne e issue da Linear, badge identificatore (`ENG-42`), avatar assignee, icona priorità
- `TaskCard` — aggiunta `linear_identifier`, link esterno Linear, badge priorità colorato
- `LinearNotConnectedBanner` — banner con link a `/profile` se API key non configurata
- `KanbanColumnWidget` (home) — invariato, usa la stessa cache

---

### Profilo — LinearIntegrationCard

Aggiunta nuova card nella sezione "Integrazioni" di `/profile`:

- Campo API Key (input password, mai mostrata in chiaro dopo salvataggio)
- Stato connessione: "Connesso — team X" / "Non configurato"
- Selector team Linear (fetch dopo inserimento API key valida)
- Pulsante "Salva" / "Rimuovi integrazione"
- Data ultima sincronizzazione

La API key viene salvata nella stessa tabella delle integrazioni esistenti (es. `user_integrations`) con `service = 'linear'` e `access_token` = API key cifrata.

---

### Widget Reminders

#### Decisione architetturale

I reminder **non hanno una sezione dedicata** — sono gestibili interamente dal widget in home. Il widget mostra reminder futuri/non completati; i completati sono accessibili tramite link "X completati →" che apre una modale con lo storico.

#### Schema: `reminders`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID NOT NULL DEFAULT auth.uid()
title         TEXT NOT NULL
notes         TEXT
due_date      DATE NOT NULL
due_time      TIME                              -- opzionale
priority      TEXT NOT NULL DEFAULT 'none'     -- 'none' | 'low' | 'medium' | 'high' | 'urgent'
recurrence    TEXT                             -- null | 'daily' | 'weekly' | 'monthly' | 'yearly'
completed     BOOLEAN NOT NULL DEFAULT FALSE
completed_at  TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

RLS standard: `auth.uid() = user_id`.

#### UI — RemindersWidget

**Vista principale (reminder futuri/non completati):**
- Lista ordinata per `due_date` ASC
- Ogni riga: checkbox completamento + titolo + data + badge priorità
- Click checkbox → marca completato (optimistic update)
- Click riga → apre `ReminderEditModal`
- Pulsante "+ Aggiungi" → apre `ReminderCreateModal`
- Link "X completati →" in fondo → apre `CompletedRemindersModal`

**`CompletedRemindersModal`:**
- Lista reminder completati, ordinata per `completed_at` DESC
- Ogni riga: titolo, data originale, data completamento, pulsante "Riapri"
- Paginazione semplice (20 per pagina)

**`ReminderCreateModal` / `ReminderEditModal`:**
- Campi: titolo (required), note, data (required), orario (opzionale), priorità (select), ricorrenza (select)
- Pulsante "Elimina" in `ReminderEditModal`

#### Logica ricorrenza

Quando un reminder ricorrente viene marcato come completato, viene creato automaticamente il successivo:

```
daily   → due_date + 1 giorno
weekly  → due_date + 7 giorni
monthly → due_date + 1 mese (stesso giorno)
yearly  → due_date + 1 anno (stesso giorno)
```

Il nuovo reminder eredita tutti i campi del precedente (`completed = false`).

#### Aggiunta al `dashboard_widgets`

```
type: 'reminders'   -- nuovo tipo widget, nessun campo config necessario
```

#### Componenti

- `RemindersWidget` — container widget, lista reminder attivi, link completati
- `ReminderRow` — singola riga con checkbox, titolo, data, badge priorità
- `ReminderCreateModal` — form creazione
- `ReminderEditModal` — form modifica/eliminazione
- `CompletedRemindersModal` — storico completati con "Riapri"
- `useReminders` — hook React Query: fetch, create, update, complete, delete
