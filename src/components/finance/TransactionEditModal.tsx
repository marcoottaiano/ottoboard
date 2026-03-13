'use client'

import { useCategories } from '@/hooks/useCategories'
import { useDeleteTransaction, useUpdateTransaction } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionWithCategory, TransactionType } from '@/types'
import { X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  transaction: TransactionWithCategory
  onClose: () => void
}

export function TransactionEditModal({ transaction, onClose }: Props) {
  const { data: categories } = useCategories()
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()

  const [type, setType] = useState<TransactionType>(transaction.type)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? '')
  const [description, setDescription] = useState(transaction.description ?? '')
  const [date, setDate] = useState(transaction.date)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = categories?.filter((c) => c.type === type || c.type === 'both') ?? []
  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ''} ${c.name}`,
  }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) { setError('Importo non valido'); return }
    try {
      await updateTx.mutateAsync({ id: transaction.id, amount: amountNum, type, category_id: categoryId, description: description || undefined, date })
      onClose()
    } catch {
      setError('Errore durante il salvataggio')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTx.mutateAsync(transaction.id)
      onClose()
    } catch {
      setError('Errore durante l\'eliminazione')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-[#0f0f1a] border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Modifica transazione</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {/* Tipo */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-xs font-medium transition-colors ${type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Uscita</button>
            <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 text-xs font-medium transition-colors ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>Entrata</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Importo (€)</label>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder="Seleziona..."
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Descrizione</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opzionale" className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={updateTx.isPending} className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
              {updateTx.isPending ? 'Salvo...' : 'Salva'}
            </button>

            {confirmDelete ? (
              <div className="flex gap-1">
                <button type="button" onClick={handleDelete} disabled={deleteTx.isPending} className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/30 transition-colors">
                  {deleteTx.isPending ? '...' : 'Conferma'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg hover:bg-white/10 text-gray-500 text-xs transition-colors">
                  Annulla
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="px-3 py-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 text-sm transition-colors">
                Elimina
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
