'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, ArrowRight, LayoutDashboard } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleContinue = async () => {
    setLoading(true)
    // Seed default finance categories (idempotent)
    await fetch('/api/onboarding/seed-categories', { method: 'POST' })
    setLoading(false)
    setStep(2)
  }

  const handleSkip = () => {
    router.push('/')
  }

  const handleConnectStrava = () => {
    window.location.href = '/api/strava/connect'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-orange-600/8 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-72 h-72 rounded-full bg-purple-600/8 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-64 h-64 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-purple-500 to-emerald-500 flex items-center justify-center">
            <span className="text-sm font-black text-white">OB</span>
          </div>
          <span className="text-lg font-semibold text-white/90 tracking-wide">Ottoboard</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={[
                'h-1.5 rounded-full transition-all duration-300',
                step === s ? 'w-6 bg-white/60' : 'w-3 bg-white/15',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6">
          {/* Step 1 — Benvenuto */}
          {step === 1 && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 via-purple-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center">
                  <LayoutDashboard size={26} className="text-white/70" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white/90 mb-2">Benvenuto su Ottoboard!</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  La tua dashboard personale è pronta. Abbiamo configurato le categorie di spesa di default per il modulo Finanze.
                </p>
              </div>

              <button
                onClick={handleContinue}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Configurazione…
                  </>
                ) : (
                  <>
                    Continua
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2 — Strava */}
          {step === 2 && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Zap size={26} className="text-orange-400" />
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-white/90 mb-2">Colleghi Strava?</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  Sincronizza automaticamente le tue attività sportive. Puoi farlo anche più tardi dalla pagina Profilo.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleConnectStrava}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/20 text-orange-400 text-sm font-medium rounded-xl py-2.5 transition-all duration-200"
                >
                  <Zap size={15} />
                  Connetti Strava
                </button>

                <button
                  onClick={handleSkip}
                  className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors"
                >
                  Salta, lo faccio dopo →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
