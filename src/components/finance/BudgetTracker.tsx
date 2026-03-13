'use client'

import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useUpsertBudget } from '@/hooks/useFinanceMutations'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface Props {
  month: string
}

export function BudgetTracker({ month }: Props) {
  const { data: budgets, isLoading: loadingBudgets } = useBudgets(month)
  const { data: transactions, isLoading: loadingTx } = useTransactions({ month, type: 'expense' })
  const { data: categories } = useCategories()
  const upsertBudget = useUpsertBudget()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // New budget form
  const [addingBudget, setAddingBudget] = useState(false)
  const [newBudgetCategoryId, setNewBudgetCategoryId] = useState('')
  const [newBudgetAmount, setNewBudgetAmount] = useState('')

  const isLoading = loadingBudgets || loadingTx

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded" />)}
        </div>
      </div>
    )
  }

  // Calcola spesa per categoria
  const spentByCategory = new Map<string, number>()
  for (const t of transactions ?? []) {
    if (t.category_id) {
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + t.amount)
    }
  }

  const handleSaveEdit = (categoryId: string) => {
    const amount = parseFloat(editAmount)
    if (!amount || amount <= 0) return
    upsertBudget.mutate({ category_id: categoryId, amount, month })
    setEditingId(null)
  }

  const handleAddBudget = () => {
    const amount = parseFloat(newBudgetAmount)
    if (!newBudgetCategoryId || !amount || amount <= 0) return
    upsertBudget.mutate({ category_id: newBudgetCategoryId, amount, month })
    setAddingBudget(false)
    setNewBudgetCategoryId('')
    setNewBudgetAmount('')
  }

  // Categorie di spesa senza budget impostato
  const budgetedCategoryIds = new Set((budgets ?? []).map((b) => b.category_id))
  const unbudgetedCategories = (categories ?? []).filter(
    (c) => (c.type === 'expense' || c.type === 'both') && !budgetedCategoryIds.has(c.id)
  )

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-400">Budget mensile</h3>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <HelpCircle size={13} />
          </button>
        </div>
        {unbudgetedCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setAddingBudget((v) => !v)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${addingBudget ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'}`}
          >
            + Aggiungi
          </button>
        )}
      </div>

      {showHelp && (
        <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300 leading-relaxed">
            I <strong>budget</strong> ti permettono di impostare un limite mensile per ogni categoria di spesa.
            La barra ti mostra quanto hai già speso rispetto al limite: <span className="text-emerald-400">verde</span> = ok,{' '}
            <span className="text-yellow-400">giallo</span> = quasi al limite,{' '}
            <span className="text-red-400">rosso</span> = sforato.
            Clicca sull&apos;importo del budget per modificarlo.
          </p>
        </div>
      )}

      {/* Form aggiungi budget */}
      {addingBudget && (
        <div className="mb-3 p-3 bg-black/20 border border-white/10 rounded-lg flex flex-wrap items-center gap-2">
          <select
            value={newBudgetCategoryId}
            onChange={(e) => setNewBudgetCategoryId(e.target.value)}
            className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none [color-scheme:dark]"
          >
            <option value="">Seleziona categoria...</option>
            {unbudgetedCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="0.00"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
              className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
            />
            <span className="text-xs text-gray-500">€/mese</span>
          </div>
          <button
            type="button"
            onClick={handleAddBudget}
            disabled={!newBudgetCategoryId || !newBudgetAmount}
            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            Salva
          </button>
          <button
            type="button"
            onClick={() => setAddingBudget(false)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Annulla
          </button>
        </div>
      )}

      {!budgets || budgets.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-gray-600 text-sm">Nessun budget impostato</p>
          <p className="text-gray-700 text-xs">Clicca &quot;+ Aggiungi&quot; per impostare un limite mensile per le tue categorie di spesa</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => {
            const spent = spentByCategory.get(budget.category_id) ?? 0
            const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            const barColor = pct < 80 ? 'bg-emerald-500' : pct < 100 ? 'bg-yellow-500' : 'bg-red-500'
            const isEditing = editingId === budget.category_id

            return (
              <div key={budget.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">
                    {budget.category?.icon} {budget.category?.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">{formatEur(spent)}</span>
                    <span className="text-gray-600">/</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(budget.category_id); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleSaveEdit(budget.category_id)} className="text-emerald-400 hover:text-emerald-300">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-400">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(budget.category_id); setEditAmount(String(budget.amount)) }}
                        className="text-gray-300 hover:text-white transition-colors"
                        title="Clicca per modificare"
                      >
                        {formatEur(budget.amount)}
                      </button>
                    )}
                    {pct > 100 && (
                      <span className="text-red-400 font-medium">+{formatEur(spent - budget.amount)}</span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
