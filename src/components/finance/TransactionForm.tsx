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
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string; submit?: string }>({})

  const filteredCategories = categories?.filter(
    (c) => c.type === type || c.type === 'both'
  ) ?? []

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ''} ${c.name}`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { amount?: string; category?: string; date?: string } = {}
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) newErrors.amount = 'Importo non valido'
    if (!categoryId) newErrors.category = 'Seleziona una categoria'
    if (!date) newErrors.date = 'Data obbligatoria'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    try {
      await createTx.mutateAsync({ amount: amountNum, type, category_id: categoryId, description: description || undefined, date })
      setAmount('')
      setDescription('')
      setDate(todayISO())
    } catch {
      setErrors({ submit: 'Errore durante il salvataggio. Riprova.' })
    }
  }

  const accentColor = type === 'income' ? 'emerald' : 'red'

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
      <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">Aggiungi transazione</h3>
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Row 1: Tipo + Importo */}
        <div className="flex gap-2">
          {/* Tipo toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] flex-shrink-0">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategoryId(''); setErrors((prev) => ({ ...prev, category: undefined, submit: undefined })) }}
              className={`px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`}
            >
              Uscita
            </button>
            <div className="w-px bg-white/[0.08]" />
            <button
              type="button"
              onClick={() => { setType('income'); setCategoryId(''); setErrors((prev) => ({ ...prev, category: undefined, submit: undefined })) }}
              className={`px-4 py-2.5 text-xs font-semibold transition-all duration-200 ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'}`}
            >
              Entrata
            </button>
          </div>

          {/* Importo */}
          <div className="flex-1 min-w-0">
            <div className={`flex items-center bg-white/[0.05] border rounded-xl px-3 py-2.5 gap-2 transition-colors ${errors.amount ? 'border-red-500/40' : 'border-white/[0.08] focus-within:border-white/20'}`}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors((prev) => ({ ...prev, amount: undefined })) }}
                placeholder="0.00"
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-white/20 focus:outline-none"
              />
              <span className={`text-sm font-semibold flex-shrink-0 ${accentColor === 'emerald' ? 'text-emerald-400' : 'text-red-400'}`}>€</span>
            </div>
            {errors.amount && <p className="text-xs text-red-400 mt-1 pl-1">{errors.amount}</p>}
          </div>
        </div>

        {/* Row 2: Categoria */}
        <div>
          <Select
            value={categoryId}
            onChange={(v) => { setCategoryId(v); setErrors((prev) => ({ ...prev, category: undefined })) }}
            options={categoryOptions}
            placeholder="Categoria..."
            className={`w-full ${errors.category ? 'border-red-500/40' : ''}`}
          />
          {errors.category && <p className="text-xs text-red-400 mt-1 pl-1">{errors.category}</p>}
        </div>

        {/* Row 3: Data + Descrizione */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors((prev) => ({ ...prev, date: undefined, submit: undefined })) }}
            className={`w-full sm:w-auto bg-white/[0.05] border rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-white/20 transition-colors ${errors.date ? 'border-red-500/40' : 'border-white/[0.08]'}`}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione (opzionale)"
            className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Row 4: Submit */}
        <button
          type="submit"
          disabled={createTx.isPending}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
            accentColor === 'emerald'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
          }`}
        >
          <PlusCircle size={15} />
          {createTx.isPending ? 'Salvataggio…' : 'Aggiungi transazione'}
        </button>

        {errors.submit && <p className="text-xs text-red-400 text-center">{errors.submit}</p>}
      </form>
    </div>
  )
}
