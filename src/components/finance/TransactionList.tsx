'use client'

import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useBulkDeleteTransactions, useBulkRecategorizeTransactions } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType, TransactionWithCategory } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { TransactionEditModal } from './TransactionEditModal'

const PAGE_SIZE = 20

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'income', label: 'Entrate' },
  { value: 'expense', label: 'Uscite' },
]

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface Props {
  month: string
}

export function TransactionList({ month }: Props) {
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<TransactionWithCategory | null>(null)

  // Multi-select state
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const hasEverSelectedRef = useRef(false)

  // Bulk action UI state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategorySelector, setShowCategorySelector] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState('')

  const { data: transactions, isLoading } = useTransactions({
    month,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })
  const { data: categories } = useCategories()

  const bulkDelete = useBulkDeleteTransactions()
  const bulkRecategorize = useBulkRecategorizeTransactions()

  const filtered = (transactions ?? []).filter((t) =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // AC 4: Auto-exit multi-select when selection becomes empty (only after items were selected)
  useEffect(() => {
    if (isMultiSelect && hasEverSelectedRef.current && selectedIds.size === 0) {
      setIsMultiSelect(false)
      hasEverSelectedRef.current = false
    }
  }, [isMultiSelect, selectedIds])

  function enterMultiSelect() {
    setIsMultiSelect(true)
    setSelectedIds(new Set())
    hasEverSelectedRef.current = false
    setShowDeleteConfirm(false)
    setShowCategorySelector(false)
    setBulkCategoryId('')
  }

  function exitMultiSelect() {
    setIsMultiSelect(false)
    setSelectedIds(new Set())
    hasEverSelectedRef.current = false
    setShowDeleteConfirm(false)
    setShowCategorySelector(false)
    setBulkCategoryId('')
  }

  function toggleId(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      hasEverSelectedRef.current = true
    }
    setSelectedIds(next)
  }

  function toggleSelectAllPage() {
    const pageIds = paginated.map((t) => t.id)
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      // Deselect all on page
      const next = new Set(selectedIds)
      pageIds.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      // Select all on page
      const next = new Set(selectedIds)
      pageIds.forEach((id) => {
        next.add(id)
        hasEverSelectedRef.current = true
      })
      setSelectedIds(next)
    }
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        exitMultiSelect()
      },
    })
  }

  function handleBulkRecategorize(categoryId: string) {
    const ids = [...selectedIds]
    bulkRecategorize.mutate({ ids, categoryId }, {
      onSuccess: () => {
        exitMultiSelect()
      },
    })
  }

  const allPageSelected = paginated.length > 0 && paginated.every((t) => selectedIds.has(t.id))
  const somePageSelected = paginated.some((t) => selectedIds.has(t.id))

  // Category options for bulk recategorize — show expense categories
  const expenseCategoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => c.type === 'expense' || c.type === 'both')
    .map((c) => ({ value: c.id, label: `${c.icon ?? ''} ${c.name}`.trim() }))

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex-1">Transazioni</h3>

        {!isMultiSelect ? (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Cerca..."
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-gray-300 placeholder:text-gray-600 focus:outline-none w-32"
            />

            <Select
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v as TransactionType | 'all'); setPage(0) }}
              options={TYPE_OPTIONS}
              showPlaceholder={false}
              className="w-28"
            />

            <button
              onClick={enterMultiSelect}
              className="text-xs text-gray-400 hover:text-gray-200 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 transition-colors"
            >
              Seleziona
            </button>
          </>
        ) : (
          <button
            onClick={exitMultiSelect}
            className="text-xs text-gray-400 hover:text-gray-200 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 transition-colors"
          >
            Annulla
          </button>
        )}
      </div>

      {/* Bulk action toolbar — visible when items are selected */}
      {isMultiSelect && selectedIds.size > 0 && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-emerald-300 font-medium flex-1">
              {selectedIds.size} selezionat{selectedIds.size === 1 ? 'a' : 'e'}
            </span>

            {/* Delete inline confirm */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => { setShowDeleteConfirm(true); setShowCategorySelector(false) }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Elimina selezionati
              </button>
            ) : (
              <>
                <button
                  onClick={handleConfirmDelete}
                  disabled={bulkDelete.isPending}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {bulkDelete.isPending ? 'Eliminazione...' : 'Conferma eliminazione'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Annulla
                </button>
              </>
            )}

            {/* Change category button */}
            {!showDeleteConfirm && (
              <button
                onClick={() => { setShowCategorySelector((v) => !v); setShowDeleteConfirm(false) }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Cambia categoria
              </button>
            )}
          </div>

          {/* Inline category selector */}
          {showCategorySelector && !showDeleteConfirm && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Nuova categoria:</span>
              <Select
                value={bulkCategoryId}
                onChange={(v) => {
                  if (!v) return
                  setBulkCategoryId(v)
                  handleBulkRecategorize(v)
                }}
                options={expenseCategoryOptions}
                placeholder="Seleziona categoria..."
                showPlaceholder={true}
                className="flex-1 max-w-xs"
              />
              {bulkRecategorize.isPending && (
                <span className="text-xs text-gray-500">Aggiornamento...</span>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-10 text-center text-gray-600 text-sm">Nessuna transazione trovata</div>
      ) : (
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600 border-b border-white/5">
                {isMultiSelect && (
                  <th className="pb-2 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected && !allPageSelected
                      }}
                      onChange={toggleSelectAllPage}
                      className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="pb-2 font-normal">Data</th>
                <th className="pb-2 font-normal">Categoria</th>
                <th className="pb-2 font-normal">Descrizione</th>
                <th className="pb-2 font-normal text-right">Importo</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => {
                    if (isMultiSelect) {
                      toggleId(t.id)
                    } else {
                      setSelected(t)
                    }
                  }}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                    isMultiSelect && selectedIds.has(t.id) ? 'bg-emerald-500/5' : ''
                  }`}
                >
                  {isMultiSelect && (
                    <td className="py-2.5 pr-2 w-8" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleId(t.id)}
                        className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="py-2.5 text-gray-500 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="py-2.5">
                    {t.category ? (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: `${t.category.color}20`, color: t.category.color ?? undefined }}>
                        {t.category.icon} {t.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-400 max-w-[200px] truncate">{t.description ?? '—'}</td>
                  <td className={`py-2.5 font-medium text-right whitespace-nowrap ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatEur(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>{filtered.length} transazioni</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">←</button>
            <span className="px-2 py-1 text-gray-400">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-2 py-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors">→</button>
          </div>
        </div>
      )}

      {selected && <TransactionEditModal transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
