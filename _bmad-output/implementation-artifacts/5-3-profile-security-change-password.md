# Story 5.3: Profile Security — Change Password

**Epic:** 5 — Beta User Self-Onboarding & Profile Management
**Story ID:** 5.3
**Story Key:** `5-3-profile-security-change-password`
**Status:** ready-for-dev
**Created:** 2026-03-20

---

## User Story

As an authenticated user,
I want to change my password from the profile page by entering my current password followed by a new one,
So that I can securely update my credentials without relying on the "forgot password" email flow.

---

## Acceptance Criteria

**Given** I am on `/profile`
**When** I open the "Cambia password" form
**Then** I see three fields: "Password attuale", "Nuova password", "Conferma password"

**Given** I submit with a wrong current password
**When** the verification fails
**Then** I see "Password attuale non corretta." inline at field level — no redirect

**Given** I submit with a new password shorter than 8 characters
**When** client-side validation runs
**Then** I see "La password deve essere di almeno 8 caratteri." before any API call

**Given** the new password and confirmation do not match
**When** client-side validation runs
**Then** I see "Le password non coincidono." before any API call

**Given** all fields are valid and current password is correct
**When** I click "Aggiorna password"
**Then** the password is updated, the form resets to empty, and a green success banner "Password aggiornata con successo." is shown

**Given** the form is submitting
**When** the mutation is pending
**Then** the button shows a spinner and "Aggiornamento..." and all fields are disabled

---

## Context for the Dev Agent

### What This Story Does

Modifies the **existing** `ChangePasswordForm` component to add a "password attuale" field for current password verification.

The current implementation (`src/components/profile/ChangePasswordForm.tsx`) has only two fields:
- `newPassword`
- `confirmPassword`

It calls `supabase.auth.updateUser({ password })` directly without verifying the current password first. The CLAUDE.md spec requires: **vecchia password + nuova (con conferma)**.

The fix: add a `currentPassword` field and, before calling `updateUser`, verify the current password by calling `supabase.auth.signInWithPassword({ email, password: currentPassword })`. This re-authenticates the user and refreshes the session. If it throws/returns an error, the current password is wrong.

### What Already Exists (DO NOT REINVENT)

| Item | File | Status |
|------|------|--------|
| `ChangePasswordForm` | `src/components/profile/ChangePasswordForm.tsx` | EXISTS — MODIFY only |
| Profile page | `src/app/profile/page.tsx` | EXISTS — no changes needed |
| Supabase client (browser) | `src/lib/supabase/client.ts` → `createClient()` | EXISTS — already imported in `ChangePasswordForm` |
| Forgot-password page | `src/app/auth/forgot-password/page.tsx` | EXISTS — fully working, no changes needed |
| Reset-password page | `src/app/auth/reset-password/page.tsx` | EXISTS — fully working, no changes needed |
| Auth callback route | `src/app/auth/callback/route.ts` | EXISTS — handles `type=recovery` → `/auth/reset-password`, no changes needed |
| Login page | `src/app/auth/login/page.tsx` | EXISTS — shows `?reset=success` banner, no changes needed |

### What Must Be Created / Modified

| Action | File | Note |
|--------|------|------|
| **MODIFY** | `src/components/profile/ChangePasswordForm.tsx` | Add `currentPassword` field + verification step before `updateUser` |

**No other files need to be changed.**

---

## Technical Implementation

### Modified `ChangePasswordForm`

**File:** `src/components/profile/ChangePasswordForm.tsx`

#### State changes

Add one new state variable:

```typescript
const [currentPassword, setCurrentPassword] = useState('')
const [showCurrent, setShowCurrent] = useState(false)
```

Full state list after change:
```typescript
const [currentPassword, setCurrentPassword] = useState('')
const [newPassword, setNewPassword] = useState('')
const [confirmPassword, setConfirmPassword] = useState('')
const [showCurrent, setShowCurrent] = useState(false)
const [showNew, setShowNew] = useState(false)
const [showConfirm, setShowConfirm] = useState(false)
const [validationError, setValidationError] = useState<string | null>(null)
```

#### Updated `mutationFn` — verify current password first

```typescript
const mutation = useMutation({
  mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    const supabase = createClient()

    // Step 1: get user email for re-authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('Sessione non valida. Rieffettua il login.')

    // Step 2: verify current password via signInWithPassword
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) throw new Error('Password attuale non corretta.')

    // Step 3: update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) throw new Error(updateError.message)
  },
  onSuccess: () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  },
})
```

#### Updated `handleSubmit` — pass currentPassword to mutation

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  setValidationError(null)
  mutation.reset()

  if (newPassword.length < 8) {
    setValidationError('La password deve essere di almeno 8 caratteri.')
    return
  }
  if (newPassword !== confirmPassword) {
    setValidationError('Le password non coincidono.')
    return
  }

  mutation.mutate({ currentPassword, newPassword })
}
```

#### Updated JSX — add "Password attuale" field as first field

Insert before the "Nuova password" block:

```tsx
{/* Password attuale */}
<div className="space-y-1.5">
  <label className="text-xs text-white/40">Password attuale</label>
  <div className="relative">
    <input
      type={showCurrent ? 'text' : 'password'}
      value={currentPassword}
      onChange={(e) => setCurrentPassword(e.target.value)}
      placeholder="••••••••"
      disabled={mutation.isPending}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all pr-10 disabled:opacity-50"
      required
    />
    <button
      type="button"
      onClick={() => setShowCurrent(!showCurrent)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
    >
      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  </div>
</div>
```

Also add `disabled={mutation.isPending}` to the existing "Nuova password" and "Conferma password" inputs.

#### Complete file after changes

The form structure becomes:

```
[Lock icon] "Cambia password"

[Password attuale input + eye toggle]
[Nuova password input + eye toggle]
[Conferma password input + eye toggle]

[Error banner — validation or mutation error]
[Success banner — mutation success]

[Aggiorna password button — spinner when pending]
```

---

## Security Notes

- `signInWithPassword` before `updateUser` is the correct Supabase pattern for "change password with current password verification". It re-authenticates the user and refreshes the session — it does NOT sign out other sessions.
- The error from `signInWithPassword` on wrong password should be surfaced as "Password attuale non corretta." — do not expose the raw Supabase error message which leaks internal details.
- `getUser()` on the client uses the active session cookie — it will return null only if the session has expired, in which case the middleware would have already redirected to login.

---

## Dev Notes

### Do NOT Touch Other Files

The entire delivery is one file modification: `src/components/profile/ChangePasswordForm.tsx`. The profile page (`src/app/profile/page.tsx`) renders `<ChangePasswordForm />` with no props and needs no changes.

### Styling — Follow Existing Patterns Exactly

The existing form uses:
- Container: `rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4`
- Input: `w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all pr-10`
- Label: `text-xs text-white/40`
- Icon color: `text-sky-400` (sky module theme)
- Button: `flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium`

Copy the exact class strings from the existing two inputs for the new "Password attuale" field — do NOT invent new classes.

### `mutation.mutate` Signature Change

The current code calls `mutation.mutate(newPassword)` (a string). After this change it calls `mutation.mutate({ currentPassword, newPassword })` (an object). The `mutationFn` signature must match: `async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string })`.

### Forgot Password Link (Optional UX Enhancement)

The form could include a small "Hai dimenticato la password attuale? →" link pointing to `/auth/forgot-password`. This is optional — only add it if it fits naturally below the "Password attuale" field without visual clutter.

### Error Priority

Validation errors (`validationError`) take precedence over mutation errors. The error display block already handles this:

```tsx
{(validationError || mutation.isError) && (
  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
    <AlertCircle size={13} className="flex-shrink-0" />
    {validationError ?? (mutation.error as Error)?.message}
  </div>
)}
```

No changes needed to this block — `mutation.error.message` will now carry "Password attuale non corretta." from the mutationFn.

---

## Tasks

- [ ] **Task 1**: Modify `src/components/profile/ChangePasswordForm.tsx`:
  - [ ] 1a. Add `currentPassword` and `showCurrent` state variables
  - [ ] 1b. Update `mutationFn` to accept `{ currentPassword, newPassword }`, call `getUser()` + `signInWithPassword` before `updateUser`
  - [ ] 1c. Update `handleSubmit` to pass `{ currentPassword, newPassword }` to `mutation.mutate`
  - [ ] 1d. Add "Password attuale" input field (first field in form) with eye toggle and `disabled` during pending
  - [ ] 1e. Add `disabled={mutation.isPending}` to existing "Nuova password" and "Conferma password" inputs
  - [ ] 1f. Add `currentPassword` to `onSuccess` reset (set to `''`)
- [ ] **Task 2**: Verify build passes (`npm run build`) with no TypeScript errors

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List

## Change Log
