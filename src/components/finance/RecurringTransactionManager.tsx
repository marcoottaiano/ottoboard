'use client'

import { Select, SelectOption } from '@/components/ui/Select'
import { useCategories } from '@/hooks/useCategories'
import {
  useCreateRecurring,
  useDeleteRecurring,
  useRecurringTransactions,
  useToggleRecurring,
  useUpdateRecurring,
} from '@/hooks/useRecurringTransactions'
import { RecurringFrequency, RecurringTransaction, TransactionType } from '@/types'
import { ChevronDown, Pencil, PlusCircle, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Settimanale',
  monthly: 'Mensile',
  yearly: 'Annuale',
}

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: 'monthly', label: 'Mensile' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'yearly', label: 'Annuale' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Inline Form ──────────────────────────────────────────────────────────────

interface FormState {
  type: TransactionType
  amount: string
  categoryId: string
  description: string
  frequency: RecurringFrequency
  startDate: string
}

function emptyForm(): FormState {
  return { type: 'expense', amount: '', categoryId: '', description: '', frequency: 'monthly', startDate: todayISO() }
}

function fromRecurring(r: RecurringTransaction): FormState {
  return {
    type: r.type,
    amount: String(r.amount),
    categoryId: r.category_id,
    description: r.description ?? '',
    frequency: r.frequency,
    startDate: r.next_due_date,
  }
}

interface RecurringFormProps {
  initial?: RecurringTransaction
  onSave: (form: FormState) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

function RecurringForm({ initial, onSave, onCancel, isPending }: RecurringFormProps) {
  const { data: categories } = useCategories()
  const [form, setForm] = useState<FormState>(initial ? fromRecurring(initial) : emptyForm())
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const filteredCategories = categories?.filter(
    (c) => c.type === form.type || c.type === 'both'
  ) ?? []

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ''} ${c.name}`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(form.amount)
    if (!amountNum || amountNum <= 0) { setError('Importo non valido'); return }
    if (!form.categoryId) { setError('Seleziona una categoria'); return }
    try {
      await onSave(form)
    } catch {
      setError('Errore durante il salvataggio')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        {/* Tipo */}
        <div className="flex rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => { set('type', 'expense'); set('categoryId', '') }}
            className={`px-3 py-2 text-xs font-medium transition-colors ${form.type === 'expense' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Uscita
          </button>
          <button
            type="button"
            onClick={() => { set('type', 'income'); set('categoryId', '') }}
            className={`px-3 py-2 text-xs font-medium transition-colors ${form.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Entrata
          </button>
        </div>

        {/* Importo */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0.00"
            className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-white/30"
          />
          <span className={`text-sm font-medium ${form.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>€</span>
        </div>

        {/* Categoria */}
        <Select
          value={form.categoryId}
          onChange={(v) => set('categoryId', v)}
          options={categoryOptions}
          placeholder="Categoria..."
          className="min-w-[160px]"
        />

        {/* Frequenza */}
        <Select
          value={form.frequency}
          onChange={(v) => set('frequency', v as RecurringFrequency)}
          options={FREQUENCY_OPTIONS}
          className="min-w-[130px]"
        />

        {/* Prima scadenza */}
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
        />

        {/* Descrizione */}
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Descrizione (opzionale)"
          className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
        />

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Salvo...' : 'Salva'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function RecurringRow({ item, onEdit }: { item: RecurringTransaction; onEdit: (item: RecurringTransaction) => void }) {
  const toggle = useToggleRecurring()
  const deleteR = useDeleteRecurring()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const amountColor = item.type === 'income' ? 'text-emerald-400' : 'text-red-400'
  const amountSign = item.type === 'income' ? '+' : '-'

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
      {/* Category icon */}
      <span className="text-base w-6 text-center flex-shrink-0">
        {item.category?.icon ?? '💳'}
      </span>

      {/* Description + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          {item.description || item.category?.name || '—'}
        </p>
        <p className="text-xs text-gray-500 truncate">{item.category?.name}</p>
      </div>

      {/* Frequency badge */}
      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 flex-shrink-0 hidden sm:inline">
        {FREQUENCY_LABELS[item.frequency]}
      </span>

      {/* Next due */}
      <span className="text-xs text-gray-500 flex-shrink-0 hidden md:inline">
        {formatDate(item.next_due_date)}
      </span>

      {/* Amount */}
      <span className={`text-sm font-medium tabular-nums flex-shrink-0 ${amountColor}`}>
        {amountSign}{item.amount.toFixed(2)} €
      </span>

      {/* Toggle */}
      <button
        onClick={() => toggle.mutate({ id: item.id, is_active: !item.is_active })}
        disabled={toggle.isPending}
        title={item.is_active ? 'Disattiva' : 'Attiva'}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 p-0 ${item.is_active ? 'bg-emerald-500/50' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform bg-white ${item.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>

      {/* Edit */}
      <button
        onClick={() => onEdit(item)}
        className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
      >
        <Pencil size={13} />
      </button>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => deleteR.mutate(item.id)}
            disabled={deleteR.isPending}
            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Elimina
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RecurringTransactionManager() {
  const { data: items = [], isLoading } = useRecurringTransactions()
  const createR = useCreateRecurring()
  const updateR = useUpdateRecurring()

  const [open, setOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)

  const handleCreate = async (form: FormState) => {
    await createR.mutateAsync({
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.categoryId,
      description: form.description || null,
      frequency: form.frequency,
      next_due_date: form.startDate,
    })
    setShowAddForm(false)
  }

  const handleUpdate = async (form: FormState) => {
    if (!editingItem) return
    await updateR.mutateAsync({
      id: editingItem.id,
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.categoryId,
      description: form.description || null,
      frequency: form.frequency,
      next_due_date: form.startDate,
    })
    setEditingItem(null)
  }

  const activeCount = items.filter((i) => i.is_active).length

  return (
    <div className="rounded-xl bg-white/5 border border-white/10">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCw size={15} className="text-green-400" />
          <span className="text-sm font-medium text-white">Transazioni ricorrenti</span>
          {activeCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
              {activeCount} attive
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-1">
          {isLoading ? (
            <div className="h-8 bg-white/5 rounded animate-pulse" />
          ) : items.length === 0 && !showAddForm ? (
            <p className="text-sm text-gray-500 py-2 text-center">
              Nessuna transazione ricorrente. Aggiungine una!
            </p>
          ) : (
            items.map((item) =>
              editingItem?.id === item.id ? (
                <RecurringForm
                  key={item.id}
                  initial={editingItem}
                  onSave={handleUpdate}
                  onCancel={() => setEditingItem(null)}
                  isPending={updateR.isPending}
                />
              ) : (
                <RecurringRow key={item.id} item={item} onEdit={setEditingItem} />
              )
            )
          )}

          {showAddForm ? (
            <RecurringForm
              onSave={handleCreate}
              onCancel={() => setShowAddForm(false)}
              isPending={createR.isPending}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 mt-1 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <PlusCircle size={14} />
              Aggiungi ricorrente
            </button>
          )}
        </div>
      )}
    </div>
  )
}
