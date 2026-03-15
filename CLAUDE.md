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

| Servizio  | Auth      | Note                                          |
| --------- | --------- | --------------------------------------------- |
| Strava    | OAuth 2.0 | Fetch attività e stats atleta (100 req/15min) |
| Timetree  | OAuth 2.0 | Integrazione calendario personale (Fase 8)    |

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

| Grafico             | Tipo             | Dettaglio                                                              |
| ------------------- | ---------------- | ---------------------------------------------------------------------- |
| Volume Settimanale  | Bar Chart        | Ore/km per settimana, ultime 12 settimane. Filtro per tipo sport.      |
| Pace Trend          | Line Chart       | Pace medio per uscita (solo Run). Trendline + filtro periodo.          |
| Frequenza Cardiaca  | Area Chart       | FC media nel tempo. Ultime 30 attività.                                |
| Heatmap Attività    | Calendar Heatmap | Griglia anno tipo GitHub. Arancione = allenamento, intensità = durata. |

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

| Tipo             | Componente            | Link sezione |
| ---------------- | --------------------- | ------------ |
| `last-activity`  | `LastActivityCard`    | `/fitness`   |
| `week-stats`     | `WeekStatsCard`       | `/fitness`   |
| `month-finance`  | `MonthFinanceWidget`  | `/finance`   |
| `total-balance`  | `TotalBalanceWidget`  | `/finance`   |
| `kanban-column`  | `KanbanColumnWidget`  | `/projects`  |

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

| Fase       | Modulo      | Stato | Deliverable                                                                |
| ---------- | ----------- | ----- | -------------------------------------------------------------------------- |
| **Fase 1** | Setup       | ✅    | Scaffolding Next.js, Supabase, Auth, layout shell                          |
| **Fase 2** | Fitness     | ✅    | OAuth Strava, sync attività, grafici, lista, heatmap                       |
| **Fase 3** | Finanze     | ✅    | Schema DB, form inserimento, grafici, import CSV, budget                   |
| **Fase 4** | Progetti    | ✅    | Kanban board, drag & drop, task modal, mobile UX                           |
| **Fase 5** | Home        | ✅    | Widget dashboard configurabile, DnD reorder, add/remove widget             |
| **Fase 6** | Profilo     | 🔜    | Pagina profilo: cambio password, gestione integrazione Strava multi-utente |
| **Fase 7** | Auth        | 🔜    | Registrazione, reset password, onboarding nuovo utente, test multi-account |
| **Fase 8** | Calendario  | 🔜    | Integrazione Timetree: visualizzazione eventi nel dashboard                |

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

## Fase 8 — Integrazione Timetree

### Obiettivo
Visualizzare gli eventi del calendario Timetree nella dashboard.

### Architettura prevista
- OAuth 2.0 Timetree → token salvato su Supabase (stesso pattern Strava)
- Fetch eventi via Timetree API → cache in Supabase o fetch real-time
- Widget calendario nella home (nuovo tipo widget `calendar-events`)
- Vista eventi nella sidebar o sezione dedicata

### Note
- Timetree API: `https://timetreeapis.com/` — richiede app registrata
- Scopes necessari: `read_calendar`, `read_event`
- Valutare se mostrare solo "oggi/domani" o vista settimanale completa
