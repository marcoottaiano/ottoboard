'use client'

import { useCategories } from '@/hooks/useCategories'
import { useCreateTransaction } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType } from '@/types'
import { PlusCircle } from 'lucide-react'
import { useState } from 'react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionForm() {
  const { data: categories } = useCategories()
  const createTx = useCreateTransaction()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO)
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({})

  const filteredCategories = categories?.filter(
    (c) => c.type === type || c.type === 'both'
  ) ?? []

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ''} ${c.name}`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { amount?: string; category?: string } = {}
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) newErrors.amount = 'Importo non valido'
    if (!categoryId) newErrors.category = 'Seleziona una categoria'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    await createTx.mutateAsync({ amount: amountNum, type, category_id: categoryId, description: description || undefined, date })
    setAmount('')
    setDescription('')
    setDate(todayISO())
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
              onClick={() => { setType('expense'); setCategoryId(''); setErrors((prev) => ({ ...prev, category: undefined })) }}
              className={`px-3 py-2 text-xs font-medium transition-colors ${type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Uscita
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(''); setErrors((prev) => ({ ...prev, category: undefined })) }}
              className={`px-3 py-2 text-xs font-medium transition-colors ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Entrata
            </button>
          </div>

          {/* Importo */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors((prev) => ({ ...prev, amount: undefined })) }}
                placeholder="0.00"
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
              <span className={`text-sm font-medium ${type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>€</span>
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
          </div>

          {/* Categoria */}
          <div className="flex-shrink-0">
            <Select
              value={categoryId}
              onChange={(v) => { setCategoryId(v); setErrors((prev) => ({ ...prev, category: undefined })) }}
              options={categoryOptions}
              placeholder="Categoria..."
              className="min-w-[160px]"
            />
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
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
      </form>
    </div>
  )
}
