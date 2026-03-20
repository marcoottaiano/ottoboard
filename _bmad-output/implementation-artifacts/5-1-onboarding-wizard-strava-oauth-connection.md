# Story 5.1: Onboarding Wizard — Strava OAuth Connection

**Epic:** 5 — Beta User Self-Onboarding & Profile Management
**Story ID:** 5.1
**Story Key:** `5-1-onboarding-wizard-strava-oauth-connection`
**Status:** review
**Created:** 2026-03-20

---

## User Story

As a new user,
I want to connect my Strava account via OAuth during the onboarding wizard,
So that my fitness activities are synced immediately after setup without any developer intervention.

**Prerequisito funzionale**

- Il wizard deve essere effettivamente triggerato da un gate globale: utente autenticato con onboarding non completato deve essere reindirizzato a `/onboarding` da qualsiasi route protetta (escluse `/auth/*`, `/api/*`, `/onboarding`, asset statici).

---

## Acceptance Criteria

**Given** I complete registration and land on /onboarding for the first time
**When** I reach the Strava connection step
**Then** a "Connetti Strava" button triggers the OAuth flow via `/api/strava/connect`
**And** on successful OAuth callback, a success indicator is shown and clicking "Continua" redirects to home (`/`)

**Given** I am authenticated and onboarding is not completed
**When** I open any protected route in the app
**Then** the global onboarding gate redirects me to `/onboarding`

**Given** the OAuth flow fails or I deny permissions on Strava
**When** I return to the wizard
**Then** the step shows an error with a "Riprova" button that resets the state to idle and clears error params; I am not blocked from proceeding

**Given** I click "Salta" on the Strava step (or skip on error)
**When** I proceed
**Then** the fitness module already displays an empty state with a "Connetti Strava" CTA — no broken charts (no changes needed to `/fitness/page.tsx`)

**Given** I connect Strava successfully
**When** the initial sync runs
**Then** the scope (full history vs. last 30 days) is configurable on the same step before confirming, and is passed through the OAuth state to the sync endpoint

---

## Context for the Dev Agent

### What This Story Does

Estende il wizard di onboarding esistente (`/onboarding/page.tsx`) aggiungendo:

1. **Selettore scope sync** nel passo Strava (radio button: "Ultimi 30 giorni" vs "Storia completa") — **UI già implementata**
2. **Passaggio scope attraverso l'OAuth flow** (query param `scope_days` → OAuth state Base64 → callback decode → sync endpoint)
3. **Redirect di ritorno a /onboarding** dopo il callback OAuth (invece di /fitness) — **per continuare il wizard**
4. **Stato di successo/errore nel wizard**:
   - Successo: mostra "Strava connesso!" + pulsante "Continua" che reindirizza a `/` (home)
   - Errore: mostra "Connessione fallita" + pulsante "Riprova" che resetta state e pulisce URL params
5. **Rilevamento URL params** al mount del componente per `?strava=connected` e `?error=strava_auth_denied` — **già implementato**

Il wizard ha già 2 passi (Welcome + Strava). **Non esiste step 3**, il wizard finisce al passo 2 con redirect a home.
(**Note:** Se in futuro aggiungere step 3 per categoria setup, toccare story 5.2+)

Nota di orchestrazione Epic 5:

- Story 5.1 definisce il trigger e il comportamento del gate onboarding.
- Story 5.2 deve persistere il completamento onboarding (es. `onboarding_completed_at`) per disattivare il redirect obbligatorio.

### Flusso completo aggiornato

```
Utente in /onboarding step 2 (Strava)
  → sceglie scope (default: "Ultimi 30 giorni" o "Storia completa")
  → clicca "Connetti Strava"
    └─ window.location.href = '/api/strava/connect?scope_days=30' (o 'all')

/api/strava/connect [GET]
  → legge scope_days dal query param (default: '30')
  → VALIDA: solo '30' o 'all' ammessi (default se invalido)
  → codifica nell'OAuth state: state = Buffer.from(JSON.stringify({ from: 'onboarding', scope_days })).toString('base64')
  → costruisce Strava OAuth URL con state codificato
  → window.location.href = Strava authorize URL

[Utente autorizza su Strava]

/api/strava/callback [GET]
  → decodifica state: JSON.parse(Buffer.from(state, 'base64').toString())
  → estrae from, scope_days (con fallback a 'all')
  → valida OAuth code
  → exchange code per token Strava
  → salva token su strava_tokens (già esistente)
  → triggera background sync: fetch('/api/strava/sync?scope_days=...', { signal, timeout: 30s })
    └─ sync fethca attività con after = da scope_days calcolato
  → SE from === 'onboarding'
      └─ redirect a /onboarding?strava=connected
    ELSE
      └─ redirect a /fitness (for legacy flow)

/onboarding page (on mount + useEffect)
  → rileva searchParams:
      ├─ ?strava=connected → setStravaStatus('connected')
      │   └─ UI mostra "Strava connesso!" + "Continua" button
      │   └─ Click "Continua" → router.push('/')
      │
      └─ ?error=strava_auth_denied → setStravaStatus('error')
          └─ UI mostra "Connessione fallita" + "Riprova" button
          └─ Click "Riprova" → setStravaStatus('idle') + router.replace('/onboarding')
          └─ Click "Salta" → router.push('/')

Se utente clicca "Salta" dal passo Strava
  └─ router.push('/') [skip OAuth, vai direttamente a home]

Home page (/)
  └─ User è ora loggato e a onboarding completato
  └─ Fitness module: se Strava non connesso → mostra empty state (gia implementato in /fitness/page.tsx)
```

### What Already Exists (DO NOT REINVENT)

| Existing Item               | File                                   | What It Provides                                                                                                                                                |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding wizard (2 passi) | `src/app/onboarding/page.tsx`          | Step 1: benvenuto + seed categorie; Step 2: Strava connect — **ESTENDERE, non ricreare**                                                                        |
| `/api/strava/connect` GET   | `src/app/api/strava/connect/route.ts`  | Costruisce URL OAuth Strava con `scope=activity:read_all` — **MODIFICARE per leggere scope_days e codificare state**                                            |
| `/api/strava/callback` GET  | `src/app/api/strava/callback/route.ts` | Scambia code per token, salva su `strava_tokens`, triggera sync background → redirect finale a `/fitness` — **MODIFICARE il redirect finale**                   |
| `/api/strava/sync` POST     | `src/app/api/strava/sync/route.ts`     | Sync incrementale: se `last_synced_at` è null → fetcha tutto. Usare `after` per limitare scope. — **VERIFICARE se accetta già `?scope_days` oppure modificare** |
| `useStravaConnection()`     | `src/hooks/useStravaConnection.ts`     | `isConnected`, `connect()`, `sync()`, `lastSyncedAt` — il hook già copre lo status post-sync                                                                    |
| `strava_tokens` table       | Supabase                               | Campi: `user_id`, `athlete_id`, `access_token`, `refresh_token`, `expires_at`, `scope`, `updated_at`, `last_synced_at`                                          |
| Auth callback → /onboarding | `src/app/auth/callback/route.ts:20`    | Già redirige i nuovi utenti (type=signup) a /onboarding                                                                                                         |
| `handleConnectStrava()`     | `src/app/onboarding/page.tsx:22`       | Già chiama `window.location.href = '/api/strava/connect'` — da aggiornare per includere scope_days                                                              |

### What Must Be Created / Modified

| Azione     | File                                   | Note                                                                                                                                                                   |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MODIFY** | `src/app/onboarding/page.tsx`          | Aggiungere scope selector nel passo 2; leggere `searchParams` per strava=connected / error=...; mostrare feedback; avanzare passo su successo                          |
| **MODIFY** | `src/app/api/strava/connect/route.ts`  | Leggere `scope_days` da query, codificarlo nel param `state` dell'OAuth URL (insieme a `from:'onboarding'`)                                                            |
| **MODIFY** | `src/app/api/strava/callback/route.ts` | Decodificare `state`, usare `from` per determinare redirect post-auth; passare scope_days al trigger sync                                                              |
| **MODIFY** | `src/app/api/strava/sync/route.ts`     | Accettare query param `?scope_days=30` per impostare `after = new Date(Date.now() - 30*24*3600*1000)` per il primo sync. Solo se `last_synced_at` è null (primo sync). |

---

## Technical Implementation

### 1. Sync route — supporto `scope_days`

**File:** `src/app/api/strava/sync/route.ts`

Aggiungere lettura del query param `scope_days` usato **solo** quando `last_synced_at` è null (primo sync):

```typescript
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const scopeDays = searchParams.get('scope_days') // '30' | 'all' | null

  // ... auth + fetch token row ...

  // Calcolo `after`:
  let after: Date | undefined
  if (tokenRow.last_synced_at) {
    after = new Date(tokenRow.last_synced_at)   // sync incrementale normale
  } else if (scopeDays === '30') {
    after = new Date(Date.now() - 30 * 24 * 3600 * 1000)  // primo sync limitato
  }
  // scopeDays === 'all' → after = undefined → fetcha tutto (comportamento attuale)
```

### 2. Connect route — codificare state OAuth

**File:** `src/app/api/strava/connect/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scopeDays = searchParams.get("scope_days") ?? "30"; // default: ultimi 30gg

  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Strava non configurato" }, { status: 500 });
  }

  const redirectUri = `${appUrl}/api/strava/callback`;
  const scope = "activity:read_all";

  // Codifica from e scope_days nello state OAuth per recuperarli nel callback
  const statePayload = Buffer.from(JSON.stringify({ from: "onboarding", scope_days: scopeDays })).toString("base64");

  const stravaUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaUrl.searchParams.set("client_id", clientId);
  stravaUrl.searchParams.set("redirect_uri", redirectUri);
  stravaUrl.searchParams.set("response_type", "code");
  stravaUrl.searchParams.set("scope", scope);
  stravaUrl.searchParams.set("state", statePayload);

  return NextResponse.redirect(stravaUrl.toString());
}
```

> **ATTENZIONE:** Usare `Buffer.from(...).toString('base64')` lato server (Node.js). Non usare `btoa()` che non è disponibile in tutte le versioni di Edge Runtime.

### 3. Callback route — decodifica state, redirect condizionale

**File:** `src/app/api/strava/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  // Decodifica state (opzionale — potrebbe non esserci per accessi non da wizard)
  let fromOnboarding = false;
  let scopeDays = "all";
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
      fromOnboarding = decoded.from === "onboarding";
      scopeDays = decoded.scope_days ?? "all";
    } catch {
      // state malformato — ignora, comportamento default
    }
  }

  // Errore / deny OAuth
  if (error || !code) {
    const redirectBase = fromOnboarding ? `${origin}/onboarding` : `${origin}/fitness`;
    return NextResponse.redirect(`${redirectBase}?error=strava_auth_denied`);
  }

  // ... (token exchange + save — come adesso) ...

  // Trigger sync con scope_days
  fetch(`${origin}/api/strava/sync?scope_days=${scopeDays}`, {
    method: "POST",
    headers: { Cookie: request.headers.get("cookie") ?? "" },
  }).catch(() => {});

  // Redirect post-auth
  if (fromOnboarding) {
    return NextResponse.redirect(`${origin}/onboarding?strava=connected`);
  }
  return NextResponse.redirect(`${origin}/fitness`);
}
```

### 4. Onboarding page — scope selector + feedback

**File:** `src/app/onboarding/page.tsx`

Modifiche da apportare al componente esistente:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [scopeDays, setScopeDays] = useState<'30' | 'all'>('30')
  const [stravaStatus, setStravaStatus] = useState<'idle' | 'connected' | 'error'>('idle')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Legge stato dal redirect OAuth
  useEffect(() => {
    const strava = searchParams.get('strava')
    const error = searchParams.get('error')

    if (strava === 'connected') {
      setStep(2)
      setStravaStatus('connected')
    } else if (error === 'strava_auth_denied') {
      setStep(2)
      setStravaStatus('error')
    }
  }, [searchParams])

  const handleConnectStrava = () => {
    window.location.href = `/api/strava/connect?scope_days=${scopeDays}`
  }

  // Nel JSX del step 2, aggiungere:
  // 1. Se stravaStatus === 'connected': mostrare icona ✓ verde + "Strava connesso!" + pulsante "Continua →"
  // 2. Se stravaStatus === 'error': mostrare icona errore + "Connessione fallita o permesso negato" + pulsante "Riprova"
  // 3. Se stravaStatus === 'idle': mostrare il form attuale (scope selector + "Connetti Strava" + "Salta")
```

**Struttura UI del passo 2 (stato idle):**

```
[Icona Zap arancione]
"Colleghi Strava?"
"Scegli l'intervallo per la sincronizzazione iniziale:"

● Ultimi 30 giorni  (default, raccomandata)
○ Storia completa   (più lento, include tutte le attività)

[Connetti Strava]
Salta, lo faccio dopo →
```

**Struttura UI del passo 2 (stato connected):**

```
[Icona ✓ verde]
"Strava connesso!"
"La sincronizzazione è in corso in background."

[Continua →]
```

**Struttura UI del passo 2 (stato error):**

```
[Icona ⚠ gialla o rossa]
"Connessione non riuscita"
"Hai negato l'accesso o si è verificato un errore."

[Riprova]
Salta, lo faccio dopo →
```

---

## Dev Notes

### Blocking Fixes Required (da implementare)

#### 1. **Validare `scope_days` parametro** [BLOCKER #6]

In `/api/strava/connect/route.ts`:

```typescript
const allowedScopes = ["30", "all"];
const scopeDays = allowedScopes.includes(searchParams.get("scope_days") ?? "") ? searchParams.get("scope_days") : "30"; // default fallback
```

Se il valore è invalido, loggare un warning e usare default '30'. Non passare valori non validati al state OAuth.

#### 2. **Timeout + error logging su fetch di sync** [BLOCKER #8]

In `/api/strava/callback/route.ts`, sostituire:

```typescript
fetch(`${origin}/api/strava/sync?scope_days=${scopeDays}`, ...).catch(() => {})
```

Con:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

fetch(`${origin}/api/strava/sync?scope_days=${scopeDays}`, {
  method: "POST",
  headers: { Cookie: request.headers.get("cookie") ?? "" },
  signal: controller.signal,
})
  .then((res) => {
    if (!res.ok) console.error(`[Strava] Sync failed: ${res.status}`);
  })
  .catch((err) => {
    if (err.name !== "AbortError") {
      console.error("[Strava] Sync error:", err.message);
    }
  })
  .finally(() => clearTimeout(timeout));
```

Nota: usare `finally` per pulire il timeout in qualsiasi caso.

#### 3. **Finalize redirect + URL cleanup** [BLOCKER #2 & #3]

In `/onboarding/page.tsx`:

- **Dopo success**: `handleSkip()` nel "Continua" button
  ```typescript
  const handleContinuFromStrava = () => {
    router.push("/"); // Redirect to home
  };
  ```
- **Riprova button**: reset state E pulire query params
  ```typescript
  const handleRetry = () => {
    setStravaStatus("idle");
    router.replace("/onboarding"); // Rimuove ?error= dalla URL
  };
  ```

#### 4. **State encoding error handling** [BLOCKER #7]

In `/api/strava/callback/route.ts`, migliorare il try-catch:

```typescript
if (stateParam) {
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
    fromOnboarding = decoded.from === "onboarding";
    scopeDays = ["30", "all"].includes(decoded.scope_days) ? decoded.scope_days : "all";
  } catch (err) {
    console.warn("[Strava] State decode failed:", err);
    // Fallback: assume da onboarding se possibile, otherwise default
  }
}
```

### Pattern esistente da seguire

- **Stile del wizard**: usare le classi CSS già presenti (bg-white/[0.04], backdrop-blur-2xl, border-white/[0.08], rounded-2xl). Non aggiungere nuovi colori.
- **Scope selector**: UI GIÀ IMPLEMENTATA (radio buttons con `scopeDays === '30'` / `scopeDays === 'all'`)
- **`useSearchParams()`**: già wrapped in `<Suspense>` — ready to use
- **Buffer.from**: disponibile in Node.js Runtime (route.ts)

### Fitness module empty state (skip)

**Non modificare `/fitness/page.tsx`** — le AC dicono che è già supportato. Il componente `StravaConnect` è mostrato quando Strava non è connesso. AC 3 è SODDISFATTO.

### Source references

- Connect route: `src/app/api/strava/connect/route.ts`
- Callback route: `src/app/api/strava/callback/route.ts`
- Sync route: `src/app/api/strava/sync/route.ts`
- Onboarding page: `src/app/onboarding/page.tsx` ✅ QUASI COMPLETA
- Epics: `_bmad-output/planning_artifacts/epics.md` — Story 5.1

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Identified that commit `4f0ca12` added onboarding gate to documentation but did NOT implement it in code
- Middleware `src/lib/supabase/middleware.ts` had no gate logic
- Used `user.user_metadata.onboarding_completed_at` approach (no migration needed; `getUser()` in middleware fetches fresh data from Supabase)
- `handleSkip` and `handleContinueFromStrava` needed `updateUser` call before redirect to avoid infinite redirect loop

### Completion Notes List

- **Gate implemented** in `src/lib/supabase/middleware.ts`: authenticated users without `onboarding_completed_at` in **app_metadata** (service-role-only) are redirected to `/onboarding`. Excludes `/auth/*`, `/api/*`, `/onboarding` routes.
- **Persistence via server API route** `src/app/api/onboarding/complete/route.ts`: uses `createAdminClient()` (service role) to write `app_metadata.onboarding_completed_at`. This prevents client-side bypass (user_metadata is user-writable; app_metadata is not).
- **Error handling** in `src/app/onboarding/page.tsx`: `handleSkip` and `handleContinueFromStrava` call `/api/onboarding/complete` and show an error message on failure, preventing redirect-loop on network error.
- **OAuth flow already complete** (from PR #15): `connect/route.ts` encodes `scope_days` + `from:'onboarding'` in Base64 state; `callback/route.ts` decodes state, uses `fromOnboarding` for redirect, passes `scope_days` to sync with 30s timeout; `sync/route.ts` accepts `scope_days` query param for first-sync date range.
- **Onboarding UI already complete** (from PR #15): scope selector (30d/all), `stravaStatus` state machine (idle/connected/error), URL param detection via `useEffect`.
- Build passes with no TypeScript errors.

### File List

- `src/lib/supabase/middleware.ts` — Added onboarding gate checking `app_metadata.onboarding_completed_at`
- `src/app/api/onboarding/complete/route.ts` — **NEW** API route: verifies auth, writes `app_metadata.onboarding_completed_at` via service role admin client
- `src/app/onboarding/page.tsx` — `handleSkip` and `handleContinueFromStrava` now async, call `/api/onboarding/complete`, show error message on failure
- `src/app/api/strava/connect/route.ts` — (from PR #15) scope_days validation + Base64 state encoding
- `src/app/api/strava/callback/route.ts` — (from PR #15) state decoding, conditional redirect, timeout on sync
- `src/app/api/strava/sync/route.ts` — (from PR #15) scope_days support for first-sync date range

## Change Log

- 2026-03-20: Implemented onboarding gate in middleware + persistence of `onboarding_completed_at` via user_metadata (Claude Sonnet 4.6)
