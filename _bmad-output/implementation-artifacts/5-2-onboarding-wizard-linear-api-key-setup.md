# Story 5.2: Onboarding Wizard — Linear API Key Setup

**Epic:** 5 — Beta User Self-Onboarding & Profile Management
**Story ID:** 5.2
**Story Key:** `5-2-onboarding-wizard-linear-api-key-setup`
**Status:** done
**Created:** 2026-03-20

---

## User Story

As a new user,
I want to enter and validate my Linear API key during onboarding with real-time feedback,
So that my projects appear immediately after setup with no empty or broken states.

---

## Acceptance Criteria

**Given** I reach the Linear setup step in the wizard (step 3)
**When** I type or paste an API key into the input field
**Then** the system validates the key in real-time (debounced 500ms) by calling `/api/linear/validate`
**And** a green checkmark or inline error ("Chiave non valida") appears at the field level without submitting

**Given** the API key is valid
**When** I click "Salva e continua"
**Then** the key is encrypted and stored in Supabase via `/api/linear/connect`, a team selector appears, and I can choose my Linear team

**Given** I click "Salta" on the Linear step
**When** I complete the wizard
**Then** `/api/onboarding/complete` is called, the projects module shows `LinearNotConnectedBanner` — no broken Kanban

**Given** the API key is saved and a team selected
**When** I click "Completa" (or sync triggers automatically)
**Then** the Kanban board in /projects will be populated with real Linear data after the first sync, `/api/onboarding/complete` is called, and I am redirected to `/`

**Given** I complete the final onboarding step (Linear setup or explicit skip)
**When** I click the final continue/skip action
**Then** the system calls `/api/onboarding/complete` and the global onboarding gate no longer redirects me to `/onboarding`

---

## Context for the Dev Agent

### What This Story Does

Extends the existing 2-step wizard (`/onboarding/page.tsx`) to **3 steps**:

- **Step 1** — Welcome (seed categories) → UNCHANGED
- **Step 2** — Strava OAuth → **MODIFIED**: "Salta"/"Continua" now advance to Step 3 instead of completing onboarding
- **Step 3 (NEW)** — Linear API key setup: validate key → save → select team → complete onboarding

The **onboarding completion** (`/api/onboarding/complete`) is now called **exclusively from Step 3** (either on "Salva e continua + team selected" or on "Salta").

### CRITICAL: Breaking Changes to Story 5.1 Code

> **⚠️ DO NOT SKIP THIS SECTION — misunderstanding this causes infinite redirect loops.**

Story 5.1 implemented `handleSkip` and `handleContinueFromStrava` to call `/api/onboarding/complete` then `router.push("/")`. Story 5.2 **changes this behavior**:

| Handler (Step 2)           | Story 5.1 behavior          | Story 5.2 behavior (NEW) |
| -------------------------- | --------------------------- | ------------------------ |
| `handleSkip`               | complete + go home          | `setStep(3)` — go to step 3 |
| `handleContinueFromStrava` | complete + go home          | `setStep(3)` — go to step 3 |

The `completeOnboarding()` function (which calls `/api/onboarding/complete`) must be **removed from step 2 handlers** and called **only from step 3 handlers**.

Also: `const [step, setStep] = useState<1 | 2>(1)` must become `useState<1 | 2 | 3>(1)`.

### Complete Wizard Flow (Updated)

```
Step 1 — Welcome
  → Click "Continua" → seed categories → setStep(2)

Step 2 — Strava
  → Click "Connetti Strava" → OAuth flow → /onboarding?strava=connected → setStep(2), setStravaStatus('connected')
  → Click "Continua" (post-success) → setStep(3)         ← CHANGED from 5.1
  → Click "Salta" → setStep(3)                            ← CHANGED from 5.1
  → OAuth error → stravaStatus='error' → "Riprova" resets, "Salta" → setStep(3)

Step 3 — Linear (NEW)
  ┌─ linearStatus = 'idle'
  │   → type API key → debounced 500ms → GET /api/linear/validate?key=...
  │       → 200 OK: show green checkmark, enable "Salva e continua"
  │       → error: show "Chiave non valida"
  │   → click "Salva e continua" (key valid) → POST /api/linear/connect
  │       → success: setLinearStatus('team-select'), fetch teams → show team selector
  │       → error: show error message
  │   → team selector: select team → POST /api/linear/select-team
  │   → click "Completa" → POST /api/linear/sync (background, non-blocking)
  │                       → POST /api/onboarding/complete → router.push('/')
  │
  └─ click "Salta" → POST /api/onboarding/complete → router.push('/')

Home (/) — onboarding gate deactivated
  → /projects: if no linear_tokens → LinearNotConnectedBanner
```

### What Already Exists (DO NOT REINVENT)

| Existing Item                    | File                                          | What It Provides                                                                                |
| -------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `/api/linear/connect` POST       | `src/app/api/linear/connect/route.ts`         | Validates API key against Linear, encrypts with `encryptApiKey()`, stores in `linear_tokens`   |
| `/api/linear/teams` GET          | `src/app/api/linear/teams/route.ts`           | Fetches teams list using stored encrypted key                                                   |
| `/api/linear/select-team` POST   | `src/app/api/linear/select-team/route.ts`     | Stores `selected_team_id` + `selected_team_name` in `linear_tokens`, validates against Linear  |
| `/api/linear/sync` POST          | `src/app/api/linear/sync/route.ts`            | Full sync of projects/issues from Linear into local cache                                        |
| `/api/onboarding/complete` POST  | `src/app/api/onboarding/complete/route.ts`    | Sets `app_metadata.onboarding_completed_at` via admin client (from Story 5.1)                  |
| `linear_tokens` table            | Supabase                                       | Fields: `user_id`, `api_key` (encrypted), `selected_team_id`, `selected_team_name`, `last_synced_at` |
| `LinearNotConnectedBanner`       | `src/components/projects/LinearNotConnectedBanner.tsx` | Already shown in /projects when not connected — no changes needed               |
| `encryptApiKey()`                | `src/lib/linear/crypto.ts`                    | Used by connect route — never call directly from client                                         |
| Onboarding wizard                | `src/app/onboarding/page.tsx`                 | 2-step wizard — **EXTEND to 3 steps, MODIFY step 2 handlers**                                  |
| `completeOnboarding()` function  | `src/app/onboarding/page.tsx`                 | Helper that calls `/api/onboarding/complete` — already exists, reuse from step 3 only          |

### What Must Be Created / Modified

| Azione     | File                                      | Note                                                                                              |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **CREATE** | `src/app/api/linear/validate/route.ts`    | GET `?key=lin_api_...` → validate against Linear API (no save), return 200 or 400                |
| **MODIFY** | `src/app/onboarding/page.tsx`             | (1) Change step type to `1\|2\|3`; (2) Fix step 2 handlers to `setStep(3)`; (3) Add step 3 UI   |

---

## Technical Implementation

### 1. New API Route — `/api/linear/validate`

**File:** `src/app/api/linear/validate/route.ts`

Validates an API key against Linear WITHOUT saving it. Returns 200 if valid, 400 if not.
Uses `linearQuery` from `@/lib/linear/client` with the key provided in the query param.
Requires authentication (must be called by an authenticated user).

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { linearQuery } from '@/lib/linear/client'
import { TEAMS_QUERY } from '@/lib/linear/queries'

interface TeamsData {
  teams: { nodes: Array<{ id: string }> }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')?.trim() ?? ''

  if (!key) {
    return NextResponse.json({ error: 'key richiesta' }, { status: 400 })
  }

  // Auth guard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await linearQuery<TeamsData>(key, TEAMS_QUERY)
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ error: 'Chiave non valida' }, { status: 400 })
  }
}
```

> **Security note:** The API key is sent as a query parameter here, which means it appears in server logs. An alternative is to use POST with body. However, since this is a personal app with HTTPS, GET with the key in the query string is acceptable for simplicity. If you prefer POST, adjust accordingly.

### 2. Modified Onboarding Page — Step 3 UI and State

**File:** `src/app/onboarding/page.tsx`

#### State changes

```typescript
// Change step type
const [step, setStep] = useState<1 | 2 | 3>(1);

// New state for step 3
const [linearApiKey, setLinearApiKey] = useState('')
const [linearValidating, setLinearValidating] = useState(false)
const [linearKeyValid, setLinearKeyValid] = useState<boolean | null>(null) // null = not yet validated
const [linearKeyError, setLinearKeyError] = useState<string | null>(null)
const [linearStatus, setLinearStatus] = useState<'idle' | 'saving' | 'team-select' | 'selecting-team' | 'done' | 'error'>('idle')
const [linearTeams, setLinearTeams] = useState<Array<{ id: string; name: string; key: string }>>([])
const [selectedTeamId, setSelectedTeamId] = useState('')
const [selectedTeamName, setSelectedTeamName] = useState('')
const [linearError, setLinearError] = useState<string | null>(null)
const [completing, setCompleting] = useState(false)
```

#### Step 2 handlers — REMOVE completeOnboarding() calls

```typescript
// Step 2: "Salta" now goes to step 3
const handleSkip = () => {
  setStep(3)
}

// Step 2: "Continua" after Strava success goes to step 3
const handleContinueFromStrava = () => {
  setStep(3)
}
```

> **NOTE:** `completeOnboarding()` and the `completeError` state remain in the component but are only called from step 3 handlers below.

#### Debounced Linear key validation

Use a `useEffect` with a `setTimeout` (500ms debounce) to call `/api/linear/validate`:

```typescript
useEffect(() => {
  if (!linearApiKey.trim()) {
    setLinearKeyValid(null)
    setLinearKeyError(null)
    return
  }

  setLinearValidating(true)
  setLinearKeyValid(null)
  setLinearKeyError(null)

  const timer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/linear/validate?key=${encodeURIComponent(linearApiKey.trim())}`)
      if (res.ok) {
        setLinearKeyValid(true)
        setLinearKeyError(null)
      } else {
        const data = await res.json()
        setLinearKeyValid(false)
        setLinearKeyError(data.error ?? 'Chiave non valida')
      }
    } catch {
      setLinearKeyValid(false)
      setLinearKeyError('Errore di rete')
    } finally {
      setLinearValidating(false)
    }
  }, 500)

  return () => clearTimeout(timer)
}, [linearApiKey])
```

#### Step 3 save handler

```typescript
const handleSaveLinear = async () => {
  if (!linearKeyValid) return
  setLinearStatus('saving')
  setLinearError(null)

  // Save + validate via connect route
  const connectRes = await fetch('/api/linear/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: linearApiKey.trim() }),
  })

  if (!connectRes.ok) {
    const data = await connectRes.json()
    setLinearStatus('error')
    setLinearError(data.error ?? 'Errore salvataggio')
    return
  }

  // Fetch teams
  const teamsRes = await fetch('/api/linear/teams')
  if (!teamsRes.ok) {
    setLinearStatus('error')
    setLinearError('Errore caricamento team')
    return
  }

  const { teams } = await teamsRes.json()
  setLinearTeams(teams ?? [])

  // Auto-select first team if only one
  if (teams?.length === 1) {
    setSelectedTeamId(teams[0].id)
    setSelectedTeamName(teams[0].name)
  }

  setLinearStatus('team-select')
}
```

#### Step 3 complete handler (called after team selected OR on "Salta")

```typescript
const handleCompleteLinear = async (teamId?: string, teamName?: string) => {
  setCompleting(true)
  setLinearError(null)

  // Select team if provided (i.e., not skipping)
  if (teamId && teamName) {
    const teamRes = await fetch('/api/linear/select-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, teamName }),
    })
    if (!teamRes.ok) {
      setCompleting(false)
      setLinearError('Errore selezione team')
      return
    }

    // Background sync (non-blocking)
    fetch('/api/linear/sync', { method: 'POST' }).catch(() => {})
  }

  // Complete onboarding
  const ok = await completeOnboarding()
  if (!ok) {
    setCompleting(false)
    setCompleteError(true)
    return
  }

  router.push('/')
}
```

### 3. Step 3 UI Structure

The wizard card (`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6`) gains a third state.

**State `idle` (API key input):**
```
[Icona Link2 viola]
"Colleghi Linear?"
"Inserisci la tua API key per sincronizzare i tuoi progetti."

[Input password "lin_api_..."]
[Indicatore: spinner | checkmark verde | ✗ rosso + "Chiave non valida"]

[Salva e continua]   ← disabled finché key non è valid
Salta, lo faccio dopo →
```

**State `team-select` (team selector):**
```
[Icona CheckCircle verde]
"API key valida!"
"Seleziona il team Linear da sincronizzare:"

[Select dropdown con lista team]

[Completa]
Salta, lo faccio dopo →   ← qui chiama handleCompleteLinear() senza team
```

**State `error`:**
```
[Icona AlertCircle rossa]
"Errore durante la configurazione"
"{linearError}"

[Riprova]   ← setLinearStatus('idle')
Salta, lo faccio dopo →
```

**Completing state:** mostrare spinner nel pulsante attivo con testo "Configurazione…".

### 4. Step indicator update

The step indicators `[1, 2].map(...)` must become `[1, 2, 3].map(...)`.

---

## Dev Notes

### Do NOT Use `useLinearConnection` Hook in the Wizard

The `useLinearConnection` hook uses React Query (TanStack Query) and triggers background fetches for `/api/linear/status` and `/api/linear/teams` as soon as it mounts. In the onboarding wizard (a focused flow), this is unnecessary overhead and may cause race conditions. Use **direct `fetch()` calls** instead, as shown in the implementation above.

### Existing Styling — Follow These Exactly

Copy the exact Tailwind classes from step 2 in `onboarding/page.tsx`. Key patterns:
- Container: `text-center space-y-5`
- Icon container: `w-14 h-14 rounded-2xl ... flex items-center justify-center`
- Purple theme for Linear: `bg-purple-500/10 border-purple-500/20 text-purple-400`
- Input field style: `w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20`
- Primary button: `w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40`
- Skip link: `w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors`

### Linear API Key Format

Linear API keys start with `lin_api_`. The input type should be `password` (to avoid showing the key on screen). The placeholder should be `lin_api_...`.

### Security — Validate on "Salva e continua" Too

Even though debounced validation shows the green checkmark, `/api/linear/connect` also validates the key internally (it calls Linear before saving). This double validation is intentional — never trust client-side state alone.

### onboarding_completed_at — Already Implemented in Story 5.1

The gate in `src/lib/supabase/middleware.ts` reads `user.app_metadata.onboarding_completed_at`. The API route `src/app/api/onboarding/complete/route.ts` sets it via the admin client. Both are in place. Story 5.2 just needs to call `POST /api/onboarding/complete` at the end of step 3.

### `completeError` State and Error Message

The `completeError` state and its UI (`<p className="text-xs text-red-400/80 text-center mb-4">Errore di rete. Riprova tra qualche secondo.</p>`) already exist in the component from Story 5.1. Reuse them — do not add a duplicate.

### Background Sync on Team Select

Call `/api/linear/sync` fire-and-forget after selecting the team. Do not await it or show a loading state for it — the user is redirected immediately. The sync happens in the background. On first visit to `/projects`, the `LinearNotConnectedBanner` may briefly appear if sync isn't done yet, but data will populate once sync completes (React Query will refetch on mount).

### Do NOT Modify `/projects/page.tsx`

The `LinearNotConnectedBanner` is already shown when `linear_tokens` has no row for the user. This AC is satisfied without changes to the projects page.

### Source References

- Onboarding page (MODIFY): `src/app/onboarding/page.tsx`
- Linear connect route (REUSE): `src/app/api/linear/connect/route.ts`
- Linear teams route (REUSE): `src/app/api/linear/teams/route.ts`
- Linear select-team route (REUSE): `src/app/api/linear/select-team/route.ts`
- Linear sync route (REUSE): `src/app/api/linear/sync/route.ts`
- Linear client (REUSE): `src/lib/linear/client.ts` → `linearQuery()`
- Linear queries (REUSE): `src/lib/linear/queries.ts` → `TEAMS_QUERY`
- Onboarding complete route (REUSE from 5.1): `src/app/api/onboarding/complete/route.ts`
- LinearNotConnectedBanner (NO CHANGE): `src/components/projects/LinearNotConnectedBanner.tsx`

---

## Tasks

- [ ] **Task 1**: Create `src/app/api/linear/validate/route.ts` (GET `?key=...` → validate against Linear, no save, auth-guarded)
- [ ] **Task 2**: Modify `src/app/onboarding/page.tsx`:
  - [ ] 2a. Change step type from `1 | 2` to `1 | 2 | 3`
  - [ ] 2b. Update step indicator from `[1, 2]` to `[1, 2, 3]`
  - [ ] 2c. Remove `completeOnboarding()` from `handleSkip` and `handleContinueFromStrava` — replace with `setStep(3)`
  - [ ] 2d. Add step 3 state variables (linearApiKey, linearValidating, linearKeyValid, linearKeyError, linearStatus, linearTeams, selectedTeamId, selectedTeamName, linearError, completing)
  - [ ] 2e. Add debounced validation `useEffect` for `linearApiKey`
  - [ ] 2f. Add `handleSaveLinear`, `handleCompleteLinear` handlers
  - [ ] 2g. Add step 3 JSX (idle / team-select / error states)
- [ ] **Task 3**: Verify build passes (`npm run build`) with no TypeScript errors

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List

## Change Log
