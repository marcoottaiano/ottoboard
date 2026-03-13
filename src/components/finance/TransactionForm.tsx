'use client'

import { useCategories } from '@/hooks/useCategories'
import { useCreateTransaction, useCreateCategory } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType, CategoryType, SpendingType } from '@/types'
import { PlusCircle, Plus } from 'lucide-react'
import { useState } from 'react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const PRESET_COLORS = [
  '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#6b7280',
]

const QUICK_ICONS = ['🏠', '🍔', '🚗', '💊', '🎬', '📱', '🛍️', '✈️', '💰', '🎓']

const SPENDING_TYPE_OPTIONS: SelectOption[] = [
  { value: 'needs', label: 'Necessaria — 50%' },
  { value: 'wants', label: 'Accessoria — 30%' },
  { value: 'savings', label: 'Risparmio — 20%' },
]

export function TransactionForm() {
  const { data: categories } = useCategories()
  const createTx = useCreateTransaction()
  const createCat = useCreateCategory()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO)
  const [error, setError] = useState<string | null>(null)

  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [newCatSpendingType, setNewCatSpendingType] = useState('')

  const filteredCategories = categories?.filter(
    (c) => c.type === type || c.type === 'both'
  ) ?? []

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ''} ${c.name}`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) { setError('Importo non valido'); return }
    if (!categoryId) { setError('Seleziona una categoria'); return }
    try {
      await createTx.mutateAsync({ amount: amountNum, type, category_id: categoryId, description: description || undefined, date })
      setAmount('')
      setDescription('')
      setDate(todayISO())
    } catch {
      setError('Errore durante il salvataggio')
    }
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const catType: CategoryType = type === 'income' ? 'income' : 'expense'
      const newId = await createCat.mutateAsync({
        name: newCatName.trim(),
        icon: newCatIcon.trim() || undefined,
        color: newCatColor,
        type: catType,
        spending_type: (newCatSpendingType as SpendingType) || null,
      })
      if (newId) setCategoryId(newId)
      setShowNewCat(false)
      setNewCatName('')
      setNewCatIcon('')
      setNewCatColor(PRESET_COLORS[0])
      setNewCatSpendingType('')
    } catch {
      setError('Errore durante la creazione della categoria')
    }
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Aggiungi transazione</h3>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-2 items-end">
          {/* Tipo */}
          <div className="flex rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId('') }}
              className={`px-3 py-2 text-xs font-medium transition-colors ${type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Uscita
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId('') }}
              className={`px-3 py-2 text-xs font-medium transition-colors ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Entrata
            </button>
          </div>

          {/* Importo — number first, then € */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
            <span className={`text-sm font-medium ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>€</span>
          </div>

          {/* Categoria + bottone crea nuova */}
          <div className="flex items-center gap-1">
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Categoria..."
              className="min-w-[160px]"
            />
            <button
              type="button"
              onClick={() => setShowNewCat((v) => !v)}
              title="Crea nuova categoria"
              className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${showNewCat ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'}`}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Data */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
          />

          {/* Descrizione */}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione (opzionale)"
            className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={createTx.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <PlusCircle size={14} />
            {createTx.isPending ? 'Salvo...' : 'Aggiungi'}
          </button>
        </div>

        {/* Pannello nuova categoria */}
        {showNewCat && (
          <div className="mt-3 p-4 bg-black/20 border border-white/10 rounded-xl space-y-3">
            <p className="text-xs font-medium text-gray-400">Nuova categoria</p>

            {/* Icon picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="🏷️"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-14 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-white/30"
                maxLength={2}
              />
              <span className="text-xs text-gray-600">o scegli:</span>
              <div className="flex gap-1 flex-wrap">
                {QUICK_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCatIcon(icon)}
                    className={`w-7 h-7 rounded text-base hover:bg-white/10 transition-colors flex items-center justify-center ${newCatIcon === icon ? 'bg-white/15 ring-1 ring-white/20' : ''}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Name + spending type */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Nome categoria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
              />
              {type === 'expense' && (
                <Select
                  value={newCatSpendingType}
                  onChange={setNewCatSpendingType}
                  options={SPENDING_TYPE_OPTIONS}
                  placeholder="Tipo spesa (50/30/20)..."
                  className="min-w-[200px]"
                />
              )}
            </div>

            {/* Color palette */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Colore:</span>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform flex-shrink-0 ${newCatColor === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={!newCatName.trim() || createCat.isPending}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {createCat.isPending ? 'Creando...' : '+ Crea categoria'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewCat(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </form>
    </div>
  )
}
