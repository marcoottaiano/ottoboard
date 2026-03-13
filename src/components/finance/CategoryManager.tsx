'use client'

import { useCategories } from '@/hooks/useCategories'
import { useDeleteCategory } from '@/hooks/useFinanceMutations'
import { Category } from '@/types'
import { ChevronDown, ChevronUp, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'

const SPENDING_TYPE_LABEL: Record<string, string> = {
  needs: 'Necessaria',
  wants: 'Accessoria',
  savings: 'Risparmio',
}

const TYPE_LABEL: Record<string, string> = {
  income: 'Entrata',
  expense: 'Uscita',
  both: 'Entrambi',
}

function CategoryRow({ category }: { category: Category }) {
  const deleteCategory = useDeleteCategory()
  const [confirming, setConfirming] = useState(false)

  const handleDelete = () => {
    deleteCategory.mutate(category.id)
    setConfirming(false)
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
        <span className="text-xs text-gray-600 hidden sm:inline">{TYPE_LABEL[category.type]}</span>
        {category.spending_type && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
            {SPENDING_TYPE_LABEL[category.spending_type]}
          </span>
        )}

        {confirming ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500">Elimina?</span>
            <button
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
              className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
            >
              Sì
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-gray-500 hover:text-gray-400"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
            title="Elimina categoria"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories()
  const [isOpen, setIsOpen] = useState(false)

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
              <p className="text-xs text-gray-600">
                Passa il mouse su una categoria e clicca il cestino per eliminarla.
                Le transazioni associate non verranno eliminate.
              </p>

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
            </div>
          )}
        </div>
      )}
    </div>
  )
}
