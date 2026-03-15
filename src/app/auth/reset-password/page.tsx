'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Impossibile aggiornare la password. Il link potrebbe essere scaduto.')
    } else {
      await supabase.auth.signOut()
      router.push('/auth/login?reset=success')
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
          <h2 className="text-base font-semibold text-white/80 mb-1">Nuova password</h2>
          <p className="text-xs text-white/40 mb-5">Scegli una nuova password per il tuo account.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Nuova password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimo 8 caratteri"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Conferma password</label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Ripeti la nuova password"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCf(!showCf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
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
              className="w-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40 mt-1"
            >
              {loading ? 'Aggiornamento…' : 'Imposta nuova password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
