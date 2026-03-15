'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'register'

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  showToggle,
}: {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (v: string) => void
  placeholder: string
  showToggle?: boolean
}) {
  const [show, setShow] = useState(false)
  const inputType = showToggle ? (show ? 'text' : 'password') : type

  return (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all pr-10"
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registerSent, setRegisterSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirm('')
    setError(null)
    setRegisterSent(false)
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    resetForm()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o password non corretti.')
    } else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
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
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else if (data.session) {
      // Email confirmation disabled — session active immediately
      router.push('/onboarding')
      router.refresh()
    } else {
      // Email confirmation enabled — tell user to check inbox
      setRegisterSent(true)
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

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={[
                  'flex-1 py-3 text-sm font-medium transition-all duration-200',
                  tab === t
                    ? 'text-white border-b-2 border-white/40 bg-white/[0.04]'
                    : 'text-white/30 hover:text-white/60',
                ].join(' ')}
              >
                {t === 'login' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Reset password success banner */}
            {resetSuccess && tab === 'login' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
                <CheckCircle size={13} className="flex-shrink-0" />
                Password aggiornata. Accedi con la nuova password.
              </div>
            )}

            {/* Login form */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3">
                <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-white/40">Password</label>
                    <Link href="/auth/forgot-password" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                      Hai dimenticato la password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
                    />
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
                  {loading ? 'Accesso…' : 'Accedi'}
                </button>
              </form>
            )}

            {/* Register form */}
            {tab === 'register' && !registerSent && (
              <form onSubmit={handleRegister} className="space-y-3">
                <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimo 8 caratteri" showToggle />
                <InputField label="Conferma password" type="password" value={confirm} onChange={setConfirm} placeholder="Ripeti la password" showToggle />

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
                  {loading ? 'Registrazione…' : 'Crea account'}
                </button>
              </form>
            )}

            {/* Register: check email */}
            {tab === 'register' && registerSent && (
              <div className="text-center space-y-4 py-2">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Mail size={22} className="text-emerald-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80 mb-1">Controlla la tua email</p>
                  <p className="text-xs text-white/40">
                    Ti abbiamo inviato un link di conferma a <span className="text-white/60">{email}</span>
                  </p>
                </div>
                <button
                  onClick={() => switchTab('login')}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  ← Torna al login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
