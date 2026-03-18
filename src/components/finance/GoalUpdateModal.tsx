'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { FinancialGoal } from '@/types'
import { useUpdateFinancialGoal } from '@/hooks/useFinancialGoals'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface Props {
  goal: FinancialGoal
  onClose: () => void
}

export function GoalUpdateModal({ goal, onClose }: Props) {
  const [addAmount, setAddAmount] = useState('')
  const update = useUpdateFinancialGoal()

  const delta = Math.max(parseFloat(addAmount) || 0, 0)
  const newAmount = Math.min(goal.current_amount + delta, goal.target_amount)
  const willComplete = newAmount >= goal.target_amount && !goal.completed

  const handleSave = () => {
    if (delta <= 0) return
    // Merge amount update + completion flag into a single atomic write
    const patch: Parameters<typeof update.mutate>[0] = {
      id: goal.id,
      current_amount: newAmount,
      ...(willComplete ? { completed: true } : {}),
    }
    update.mutate(patch, {
      onSuccess: () => {
        toast.success(willComplete ? '🎉 Obiettivo raggiunto!' : 'Importo aggiornato')
        onClose()
      },
      onError: () => toast.error("Errore durante l'aggiornamento"),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            {goal.icon && <span>{goal.icon}</span>}
            <h2 className="text-sm font-semibold text-white">{goal.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Attuale</span>
            <span className="text-white font-medium">{formatEur(goal.current_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Target</span>
            <span className="text-gray-300">{formatEur(goal.target_amount)}</span>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Quanto aggiungi?</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+€</span>
              <input
                type="number"
                placeholder="0.00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                min="0"
                step="0.01"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {delta > 0 && (
            <div className={`p-3 rounded-lg text-xs border ${
              willComplete
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              {willComplete
                ? `🎉 Raggiungerai l'obiettivo! Nuovo totale: ${formatEur(newAmount)}`
                : `Nuovo totale: ${formatEur(newAmount)} (${((newAmount / goal.target_amount) * 100).toFixed(0)}%)`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={delta <= 0 || update.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {update.isPending ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}
