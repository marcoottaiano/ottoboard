'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateFinancialGoal } from '@/hooks/useFinancialGoals'

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

interface Props {
  onClose: () => void
}

export function GoalCreateModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const create = useCreateFinancialGoal()

  const canSubmit = name.trim().length > 0 && parseFloat(targetAmount) > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    create.mutate(
      {
        name: name.trim(),
        icon: icon.trim() || null,
        target_amount: parseFloat(targetAmount),
        current_amount: 0,
        deadline: deadline || null,
        color,
      },
      {
        onSuccess: () => {
          toast.success('Obiettivo creato')
          onClose()
        },
        onError: () => toast.error('Errore durante la creazione'),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Nuovo obiettivo</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Nome + Emoji */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="🎯"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="w-12 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:border-white/30"
            />
            <input
              type="text"
              placeholder="Nome obiettivo *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Target */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
            <input
              type="number"
              placeholder="Importo target *"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Scadenza */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Scadenza (opzionale)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Colore */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Colore barra</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
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
            onClick={handleSubmit}
            disabled={!canSubmit || create.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {create.isPending ? 'Salvataggio...' : 'Crea obiettivo'}
          </button>
        </div>
      </div>
    </div>
  )
}
