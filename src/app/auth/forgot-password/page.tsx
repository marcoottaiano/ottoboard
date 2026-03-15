'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError('Impossibile inviare l\'email. Verifica l\'indirizzo e riprova.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-orange-600/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-purple-500 to-emerald-500 flex items-center justify-center">
            <span className="text-sm font-black text-white">OB</span>
          </div>
          <span className="text-lg font-semibold text-white/90 tracking-wide">Ottoboard</span>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6">
          {!sent ? (
            <>
              <h2 className="text-base font-semibold text-white/80 mb-1">Recupera la password</h2>
              <p className="text-xs text-white/40 mb-5">
                Inserisci la tua email e ti mandiamo un link per impostare una nuova password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
                >
                  {loading ? 'Invio…' : 'Invia link di recupero'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Mail size={22} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 mb-1">Email inviata</p>
                <p className="text-xs text-white/40">
                  Controlla la casella di <span className="text-white/60">{email}</span> e clicca il link per impostare una nuova password.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <ArrowLeft size={13} />
              Torna al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
