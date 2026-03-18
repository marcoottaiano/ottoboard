'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FinancialGoal } from '@/types'
import { useUpdateFinancialGoal, useDeleteFinancialGoal, useCompleteFinancialGoal } from '@/hooks/useFinancialGoals'

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

interface Props {
  goal: FinancialGoal
  onClose: () => void
}

export function GoalEditModal({ goal, onClose }: Props) {
  const [name, setName] = useState(goal.name)
  const [icon, setIcon] = useState(goal.icon ?? '')
  const [targetAmount, setTargetAmount] = useState(String(goal.target_amount))
  const [deadline, setDeadline] = useState(goal.deadline ?? '')
  const [color, setColor] = useState(goal.color ?? PRESET_COLORS[0])
  const [confirming, setConfirming] = useState(false)

  const update = useUpdateFinancialGoal()
  const remove = useDeleteFinancialGoal()
  const complete = useCompleteFinancialGoal()

  const canSubmit = name.trim().length > 0 && parseFloat(targetAmount) > 0

  const handleSave = () => {
    if (!canSubmit) return
    update.mutate(
      {
        id: goal.id,
        name: name.trim(),
        icon: icon.trim() || null,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || null,
        color,
      },
      {
        onSuccess: () => { toast.success('Obiettivo aggiornato'); onClose() },
        onError: () => toast.error('Errore durante il salvataggio'),
      }
    )
  }

  const handleDelete = () => {
    remove.mutate(goal.id, {
      onSuccess: () => { toast.success('Obiettivo eliminato'); onClose() },
      onError: () => toast.error('Errore durante l\'eliminazione'),
    })
  }

  const handleToggleComplete = () => {
    complete.mutate(
      { id: goal.id, completed: !goal.completed },
      {
        onSuccess: () => {
          toast.success(goal.completed ? 'Obiettivo riaperto' : '🎉 Obiettivo completato!')
          onClose()
        },
        onError: () => toast.error('Errore'),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Modifica obiettivo</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
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

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Scadenza (opzionale)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>

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

          {/* Toggle completato */}
          <button
            onClick={handleToggleComplete}
            disabled={complete.isPending}
            className={`w-full py-2 text-xs rounded-lg border transition-colors ${
              goal.completed
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {goal.completed ? 'Riapri obiettivo' : '✓ Segna come completato'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Eliminare?</span>
              <button
                onClick={handleDelete}
                disabled={remove.isPending}
                className="px-3 py-1 text-xs text-red-400 bg-red-500/15 border border-red-500/25 rounded-md font-medium hover:bg-red-500/25 transition-colors"
              >
                Sì
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Elimina obiettivo"
            >
              <Trash2 size={14} />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={!canSubmit || update.isPending}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {update.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
