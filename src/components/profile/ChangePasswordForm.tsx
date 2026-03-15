'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      setNewPassword('')
      setConfirmPassword('')
    },
  })

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

    mutation.mutate(newPassword)
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-white/80">Cambia password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nuova password */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Nuova password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caratteri"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Conferma password */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/40">Conferma password</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la nuova password"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50 focus:bg-white/[0.06] transition-all pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Errori */}
        {(validationError || mutation.isError) && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="flex-shrink-0" />
            {validationError ?? (mutation.error as Error)?.message}
          </div>
        )}

        {/* Successo */}
        {mutation.isSuccess && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <CheckCircle size={13} className="flex-shrink-0" />
            Password aggiornata con successo.
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {mutation.isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-sky-400/40 border-t-sky-400 rounded-full animate-spin" />
              Aggiornamento...
            </>
          ) : (
            'Aggiorna password'
          )}
        </button>
      </form>
    </div>
  )
}
