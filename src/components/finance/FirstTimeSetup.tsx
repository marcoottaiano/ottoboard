'use client'

import { seedDefaultCategories } from '@/lib/finance/seedCategories'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onDone: () => void
}

export function FirstTimeSetup({ onDone }: Props) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSeedDefault = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await seedDefaultCategories(user.id, supabase)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      onDone()
    } catch {
      setError('Errore durante la configurazione')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
        <Wallet size={28} className="text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Benvenuto nel modulo finanze</h2>
      <p className="text-gray-500 text-sm text-center mb-8 max-w-sm">
        Per iniziare, scegli se usare le categorie predefinite (Cibo, Sport, Trasporti…) oppure partire da zero.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={handleSeedDefault}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Configurando...' : 'Usa categorie default'}
        </button>
        <button
          onClick={onDone}
          className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
        >
          Inizia da zero
        </button>
      </div>
    </div>
  )
}
