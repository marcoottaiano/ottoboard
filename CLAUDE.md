# Personal Life Dashboard — PRD v1.0

> Dashboard personale e modulare per centralizzare dati di fitness, finanze e progetti.
> Self-hosted, no abbonamenti, architettura modulare con Next.js + Supabase.

---

## Tech Stack

### Frontend
| Tecnologia | Versione | Ruolo |
|---|---|---|
| Next.js | 14 (App Router) | Framework principale, routing, SSR/SSG |
| TypeScript | 5.x strict | Type safety su tutto il progetto |
| Tailwind CSS | 3.x | Styling, design system, dark mode |
| Recharts | 2.x | Grafici (line, bar, pie, area) |
| React Query (TanStack) | 5.x | Data fetching, caching, sync stato |
| Zustand | 4.x | State management leggero (UI state) |
| dnd-kit | latest | Drag & drop per Kanban |

### Backend & Infrastruttura
| Tecnologia | Ruolo |
|---|---|
| Supabase (Free tier) | Database PostgreSQL, Auth, Storage |
| Supabase Edge Functions | OAuth flow Strava, sync dati esterni |
| Supabase RLS | Row Level Security — dati isolati per utente |
| Vercel (Free/Hobby) | Deploy Next.js, env variables |

### API Esterne
| Servizio | Auth | Note |
|---|---|---|
| Strava | OAuth 2.0 | Fetch attività e stats atleta (100 req/15min) |
| Google Calendar | OAuth 2.0 | Valutare in fase successiva (preferito a Timetree) |

---

## Struttura Cartelle

```
src/
├── app/
│   └── (dashboard)/
│       ├── layout.tsx          # Shell condivisa (sidebar, navbar)
│       ├── page.tsx            # Home / weekly overview
│       ├── fitness/
│       │   └── page.tsx        # Modulo allenamento
│       ├── finance/
│       │   └── page.tsx        # Modulo finanze
│       └── projects/
│           └── page.tsx        # Modulo progetti (kanban)
├── components/
│   ├── ui/                     # Componenti base (Button, Card, Badge...)
│   ├── fitness/                # Componenti specifici del modulo
│   ├── finance/
│   └── projects/
├── lib/
│   ├── supabase/               # Client, types generati
│   └── strava/                 # API client + tipi
├── hooks/                      # Custom hooks per ogni modulo
└── types/                      # Tipi TypeScript globali
```

---

## Autenticazione

Supabase Auth — email/password o magic link. RLS attivo su **tutte** le tabelle.

```sql
-- Policy da replicare su: activities, categories, budgets, projects, columns, tasks
CREATE POLICY "Users can only see their own data"
ON transactions
FOR ALL
USING (auth.uid() = user_id);
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
map_polyline      TEXT                   -- Encoded polyline per mappa
raw_data          JSONB                  -- Dati originali Strava completi
```

### UI — Componenti
**Hero Section:**
- `LastActivityCard` — nome, tipo (badge colorato), data, durata, distanza, FC media/max, pace, mini mappa con polyline
- `WeekStatsCard` — n° allenamenti, km totali, ore totali, calorie, delta vs settimana precedente

**Grafici (Recharts):**
| Grafico | Tipo | Dettaglio |
|---|---|---|
| Volume Settimanale | Bar Chart | Ore/km per settimana, ultime 12 settimane. Filtro per tipo sport. |
| Pace Trend | Line Chart | Pace medio per uscita (solo Run). Trendline + filtro periodo. |
| Frequenza Cardiaca | Area Chart | FC media nel tempo + zona FC. Ultime 30 attività. |
| Heatmap Attività | Calendar Heatmap | Griglia anno tipo GitHub. Verde = allenamento, intensità = durata. |

**Lista attività:** tabella paginata (20/pagina), filtri per tipo/periodo/distanza, click → modal dettaglio, link diretto a Strava.

**Skeleton UI:** `animate-pulse` su `div` con `bg-gray-200` — rettangoli proporzionali per ogni componente.

---

## Modulo 2 — Finanze

Modulo completamente owned — nessuna API esterna. Inserimento manuale + import CSV.

### Schema: `transactions`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id      UUID NOT NULL                          -- FK → auth.users (RLS)
amount       DECIMAL(10,2) NOT NULL                 -- Positivo = entrata, negativo = uscita
type         ENUM('income', 'expense') NOT NULL
category_id  UUID NOT NULL                          -- FK → categories
description  TEXT
date         DATE NOT NULL
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Schema: `categories`
```sql
id     UUID PRIMARY KEY DEFAULT gen_random_uuid()
name   TEXT NOT NULL                                -- es. Cibo, Sport, Abbonamenti
icon   TEXT                                         -- Emoji o nome icona Lucide
color  TEXT                                         -- Hex color per grafici
type   ENUM('income', 'expense', 'both') NOT NULL
```

### Schema: `budgets`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
category_id  UUID NOT NULL          -- FK → categories
amount       DECIMAL(10,2) NOT NULL -- Budget mensile
month        DATE NOT NULL          -- Primo giorno del mese
```

### UI — Componenti
**Header mensile:** saldo totale (prominente), entrate/uscite totali affiancati, delta vs mese precedente, selector mese per navigare la storia.

**Grafici:**
| Grafico | Tipo | Dettaglio |
|---|---|---|
| Spese per Categoria | Pie/Donut | Distribuzione uscite mese corrente. Click → filtro lista. |
| Andamento Mensile | Bar + Line | Entrate (verde) vs Uscite (rosso) per mese. Linea saldo. |
| Budget vs Speso | Horizontal Bar | Una barra per categoria. Rosso se over budget. |

**Form inserimento transazione:**
- Importo con segno automatico dal tipo
- Toggle Entrata / Uscita
- Select categoria (icona + colore)
- Date picker (default: oggi)
- Note opzionali
- Submit rapido con keyboard shortcut

**Import CSV:**
- Upload drag & drop
- Mapping colonne flessibile
- Preview tabellare prima del salvataggio
- Deduplicazione automatica (stessa data + importo + categoria)
- Report finale: N importate / N skippate

**Lista transazioni:** ordinata per data desc, colonne data/categoria/descrizione/importo (verde=entrata, rosso=uscita), filtri mese/tipo/categoria, ricerca testuale, edit inline o modal.

---

## Modulo 3 — Progetti (Kanban)

Struttura: `Project → Columns → Tasks`. Drag & drop con dnd-kit.

### Schema: `projects`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
name         TEXT NOT NULL
description  TEXT
color        TEXT                                    -- Hex — colore identificativo
status       ENUM('active', 'archived') NOT NULL
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Schema: `columns`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id  UUID NOT NULL       -- FK → projects
name        TEXT NOT NULL       -- es. Todo, In Progress, Done
position    INT NOT NULL        -- Ordinamento colonne
color       TEXT                -- Hex — colore header colonna
```

### Schema: `tasks`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
column_id   UUID NOT NULL
project_id  UUID NOT NULL                                        -- Denormalizzato
title       TEXT NOT NULL
description TEXT                                                 -- Markdown supportato
priority    ENUM('low', 'medium', 'high', 'urgent')
due_date    DATE
labels      TEXT[]                                               -- Array di tag liberi
position    FLOAT NOT NULL                                       -- Fractional indexing
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### UI — Componenti
**Kanban Board:**
- Colonne con header (nome + contatore task), scroll verticale indipendente, drop zone visibile durante drag, "+ Add task" in fondo, drag per riordinare colonne
- Task card: titolo (troncato 2 righe), badge priorità colorato, data scadenza (rossa se overdue), labels (max 2 + overflow badge)
- Click su card → modal dettaglio

**Task Detail Modal:**
- Titolo editabile inline
- Description con editor Markdown (o textarea con preview)
- Cambio colonna via select (oltre al drag)
- Priorità, due date, labels editabili
- Timestamps creato/aggiornato

**Project Selector (sidebar):** lista progetti con colore, badge con n° task attive, quick action nuovo progetto / archivia.

### Drag & Drop — Note tecniche
```
- useSortable     → task cards dentro ogni colonna
- useDraggable + useDroppable → spostamento tra colonne
- Fractional indexing per position: libreria "fractional-indexing" (100b, zero deps)
- Optimistic update: aggiorna UI subito → sync DB in background
- Rollback automatico se la mutation Supabase fallisce
```

---

## Layout & Shell

### Navigazione
- Sidebar fissa a sinistra su desktop (collassabile a icone)
- Bottom navigation su mobile
- Routes: `/` (home), `/fitness`, `/finance`, `/projects`
- Icone Lucide per ogni modulo

### Home Page — Weekly Overview
Widget aggregati in griglia 2×2 (desktop) / stack (mobile):
- Widget ultima attività Strava (compatto)
- Widget spese settimana (importo + vs budget)
- Widget task in scadenza (top 3 per due date)

### Theme
- Dark mode by default (toggle disponibile)
- Colore per modulo: `orange` fitness / `green` finance / `purple` projects
- Gray scale come base
- Font: Inter o Geist (già incluso in Next.js 14)

---

## Roadmap

| Fase | Modulo | Deliverable |
|---|---|---|
| **Fase 1** | Setup | Scaffolding Next.js, Supabase, Auth, layout shell |
| **Fase 2** | Fitness | OAuth Strava, sync attività, grafici, lista |
| **Fase 3** | Finanze | Schema DB, form inserimento, grafici, import CSV |
| **Fase 4** | Progetti | Kanban board, drag & drop, task modal |
| **Fase 5** | Home | Weekly overview con widget aggregati |
| **Fase 6+** | Extra | Calendario, habits tracker, goals/OKR |
