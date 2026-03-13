'use client'

import { useCategories } from '@/hooks/useCategories'
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { Category, CategoryType, SpendingType } from '@/types'
import { ChevronDown, ChevronUp, Pencil, Plus, Settings2, Trash2, X, Check } from 'lucide-react'
import { useState } from 'react'

// ─── Costanti ──────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#6b7280',
]

const QUICK_ICONS = ['🏠', '🍔', '🚗', '💊', '🎬', '📱', '🛍️', '✈️', '💰', '🎓', '💼', '🍕', '🏋️', '🎮', '🐶']

const SPENDING_OPTIONS: SelectOption[] = [
  { value: 'needs', label: 'Necessaria — 50%' },
  { value: 'wants', label: 'Accessoria — 30%' },
  { value: 'savings', label: 'Risparmio — 20%' },
]

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'expense', label: 'Uscita' },
  { value: 'income', label: 'Entrata' },
  { value: 'both', label: 'Entrambi' },
]

const SPENDING_BADGE: Record<string, string> = {
  needs: 'Necessaria',
  wants: 'Accessoria',
  savings: 'Risparmio',
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full transition-transform flex-shrink-0 ${value === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

// ─── IconPicker ───────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        placeholder="🏷️"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-sm text-white text-center focus:outline-none focus:border-white/30"
        maxLength={2}
      />
      <div className="flex gap-1 flex-wrap">
        {QUICK_ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`w-7 h-7 rounded text-base hover:bg-white/10 transition-colors flex items-center justify-center ${value === icon ? 'bg-white/15 ring-1 ring-white/20' : ''}`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // edit state
  const [editName, setEditName] = useState(category.name)
  const [editIcon, setEditIcon] = useState(category.icon ?? '')
  const [editColor, setEditColor] = useState(category.color ?? PRESET_COLORS[0])
  const [editSpendingType, setEditSpendingType] = useState(category.spending_type ?? '')

  const startEdit = () => {
    setEditName(category.name)
    setEditIcon(category.icon ?? '')
    setEditColor(category.color ?? PRESET_COLORS[0])
    setEditSpendingType(category.spending_type ?? '')
    setEditing(true)
  }

  const handleSave = async () => {
    await updateCategory.mutateAsync({
      id: category.id,
      name: editName.trim() || category.name,
      icon: editIcon.trim() || undefined,
      color: editColor,
      spending_type: (editSpendingType as SpendingType) || null,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="p-3 bg-black/20 border border-white/10 rounded-lg space-y-3 mb-1">
        <IconPicker value={editIcon} onChange={setEditIcon} />

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[140px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
          />
          {(category.type === 'expense' || category.type === 'both') && (
            <Select
              value={editSpendingType}
              onChange={setEditSpendingType}
              options={SPENDING_OPTIONS}
              placeholder="Tipo spesa..."
              className="min-w-[180px]"
            />
          )}
        </div>

        <ColorPicker value={editColor} onChange={setEditColor} />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateCategory.isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            <Check size={12} /> Salva
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={12} /> Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-white/5 group transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: category.color ?? '#6b7280' }} />
        <span className="text-sm text-gray-300 truncate">
          {category.icon} {category.name}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {category.spending_type && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-500 hidden sm:inline">
            {SPENDING_BADGE[category.spending_type]}
          </span>
        )}

        {confirming ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500">Elimina?</span>
            <button
              onClick={() => { deleteCategory.mutate(category.id); setConfirming(false) }}
              disabled={deleteCategory.isPending}
              className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
            >
              Sì
            </button>
            <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-400">No</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={startEdit}
              className="text-gray-600 hover:text-gray-300 transition-colors p-0.5"
              title="Modifica"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
              title="Elimina"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NewCategoryForm ──────────────────────────────────────────────────────────

function NewCategoryForm({ onClose }: { onClose: () => void }) {
  const createCat = useCreateCategory()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [catType, setCatType] = useState('expense')
  const [spendingType, setSpendingType] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Inserisci un nome'); return }
    try {
      await createCat.mutateAsync({
        name: name.trim(),
        icon: icon.trim() || undefined,
        color,
        type: catType as CategoryType,
        spending_type: (spendingType as SpendingType) || null,
      })
      onClose()
    } catch {
      setError('Errore durante la creazione')
    }
  }

  return (
    <div className="mt-3 p-4 bg-black/20 border border-white/10 rounded-xl space-y-3">
      <p className="text-xs font-medium text-gray-400">Nuova categoria</p>

      <IconPicker value={icon} onChange={setIcon} />

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Nome categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
        />
        <Select
          value={catType}
          onChange={setCatType}
          options={TYPE_OPTIONS}
          placeholder="Tipo..."
          className="min-w-[130px]"
        />
        {(catType === 'expense' || catType === 'both') && (
          <Select
            value={spendingType}
            onChange={setSpendingType}
            options={SPENDING_OPTIONS}
            placeholder="Tipo spesa (50/30/20)..."
            className="min-w-[200px]"
          />
        )}
      </div>

      <ColorPicker value={color} onChange={setColor} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || createCat.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          <Plus size={12} /> {createCat.isPending ? 'Creando...' : 'Crea categoria'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}

// ─── CategoryManager ──────────────────────────────────────────────────────────

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories()
  const [isOpen, setIsOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)

  const incomeCategories = (categories ?? []).filter((c) => c.type === 'income')
  const expenseCategories = (categories ?? []).filter((c) => c.type === 'expense' || c.type === 'both')

  return (
    <div className="rounded-xl bg-white/5 border border-white/10">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={14} />
          Gestisci categorie
          {categories && (
            <span className="text-xs text-gray-600">({categories.length})</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-white/5">
          {isLoading ? (
            <div className="py-4 space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-white/5 rounded-lg" />)}
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {expenseCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 px-3">Uscite</p>
                  {expenseCategories.map((cat) => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </div>
              )}

              {incomeCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 px-3">Entrate</p>
                  {incomeCategories.map((cat) => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </div>
              )}

              {(!categories || categories.length === 0) && (
                <p className="text-center text-gray-600 text-sm py-4">Nessuna categoria</p>
              )}

              {/* New category form / button */}
              {showNewForm ? (
                <NewCategoryForm onClose={() => setShowNewForm(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-2"
                >
                  <Plus size={13} /> Nuova categoria
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
