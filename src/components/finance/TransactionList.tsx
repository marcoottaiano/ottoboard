'use client'

import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useBulkDeleteTransactions, useBulkRecategorizeTransactions } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType, TransactionWithCategory } from '@/types'
import { Lock } from 'lucide-react'
import { PrivacyValue } from '@/components/ui/PrivacyValue'
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
  // P7: two-step recategorize — user selects category first, then confirms
  const [pendingCategoryId, setPendingCategoryId] = useState('')
  // P11: prevent double-submit on bulk delete
  const isSubmittingDeleteRef = useRef(false)

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

  // P10: clear selection when filter/search/month changes to prevent stale-ID operations
  useEffect(() => {
    if (isMultiSelect) {
      setIsMultiSelect(false)
      setSelectedIds(new Set())
      hasEverSelectedRef.current = false
      setShowDeleteConfirm(false)
      setShowCategorySelector(false)
      setPendingCategoryId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, search, month])

  function enterMultiSelect() {
    setIsMultiSelect(true)
    setSelectedIds(new Set())
    hasEverSelectedRef.current = false
    setShowDeleteConfirm(false)
    setShowCategorySelector(false)
    setPendingCategoryId('')
  }

  function exitMultiSelect() {
    setIsMultiSelect(false)
    setSelectedIds(new Set())
    hasEverSelectedRef.current = false
    setShowDeleteConfirm(false)
    setShowCategorySelector(false)
    setPendingCategoryId('')
    isSubmittingDeleteRef.current = false
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
      const next = new Set(selectedIds)
      pageIds.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      pageIds.forEach((id) => next.add(id))
      // P15: set ref once outside the loop, not once per ID
      hasEverSelectedRef.current = true
      setSelectedIds(next)
    }
  }

  function handleConfirmDelete() {
    // P11: prevent double-submit if user clicks rapidly before isPending transitions
    if (isSubmittingDeleteRef.current || bulkDelete.isPending) return
    isSubmittingDeleteRef.current = true
    const ids = Array.from(selectedIds)
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        exitMultiSelect()
      },
      onSettled: () => {
        isSubmittingDeleteRef.current = false
      },
    })
  }

  function handleConfirmRecategorize() {
    if (!pendingCategoryId || bulkRecategorize.isPending) return
    const ids = Array.from(selectedIds)
    bulkRecategorize.mutate({ ids, categoryId: pendingCategoryId }, {
      onSuccess: () => {
        exitMultiSelect()
      },
    })
  }

  const allPageSelected = paginated.length > 0 && paginated.every((t) => selectedIds.has(t.id))
  const somePageSelected = paginated.some((t) => selectedIds.has(t.id))

  // P13: derive category options dynamically based on selected transaction types
  const selectedTransactionTypes = new Set(
    Array.from(selectedIds)
      .map((id) => (transactions ?? []).find((t) => t.id === id)?.type)
      .filter((type): type is TransactionType => type !== undefined)
  )
  const allSelectedAreIncome = selectedTransactionTypes.size === 1 && selectedTransactionTypes.has('income')
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => {
      if (allSelectedAreIncome) return c.type === 'income' || c.type === 'both'
      return c.type === 'expense' || c.type === 'both'
    })
    .map((c) => ({ value: c.id, label: `${c.icon ?? ''} ${c.name}`.trim() }))

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      {/* Header row */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Title + action button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/50">Transazioni</h3>
          {!isMultiSelect ? (
            <button
              onClick={enterMultiSelect}
              className="text-xs text-white/30 hover:text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Seleziona
            </button>
          ) : (
            <button
              onClick={exitMultiSelect}
              className="text-xs text-white/30 hover:text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Annulla
            </button>
          )}
        </div>
        {/* Search + filter */}
        {!isMultiSelect && (
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Cerca..."
              className="flex-1 min-w-0 text-xs bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
            />
            <Select
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v as TransactionType | 'all'); setPage(0) }}
              options={TYPE_OPTIONS}
              showPlaceholder={false}
              className="w-28 flex-shrink-0"
            />
          </div>
        )}
      </div>

      {/* P12: Bulk action toolbar — fixed bottom on mobile, inline on desktop */}
      {isMultiSelect && selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:px-0 md:mb-3">
          <div className="p-3 bg-gray-900/95 md:bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-lg md:shadow-none">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-emerald-300 font-medium flex-1">
                {selectedIds.size} selezionat{selectedIds.size === 1 ? 'a' : 'e'}
              </span>

              {/* Delete inline confirm */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => { setShowDeleteConfirm(true); setShowCategorySelector(false); setPendingCategoryId('') }}
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
                  onClick={() => { setShowCategorySelector((v) => !v); setPendingCategoryId('') }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                >
                  Cambia categoria
                </button>
              )}
            </div>

            {/* P7: two-step recategorize — select category, then confirm */}
            {showCategorySelector && !showDeleteConfirm && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Nuova categoria:</span>
                  <Select
                    value={pendingCategoryId}
                    onChange={(v) => { if (v) setPendingCategoryId(v) }}
                    options={categoryOptions}
                    placeholder="Seleziona categoria..."
                    showPlaceholder={true}
                    className="flex-1 max-w-xs"
                  />
                </div>
                {pendingCategoryId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConfirmRecategorize}
                      disabled={bulkRecategorize.isPending}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                    >
                      {bulkRecategorize.isPending ? 'Aggiornamento...' : 'Conferma categoria'}
                    </button>
                    <button
                      onClick={() => setPendingCategoryId('')}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-10 text-center text-gray-600 text-sm">Nessuna transazione trovata</div>
      ) : (
        <div className="space-y-0.5">
          {/* Header — desktop only */}
          <div className="hidden md:grid md:grid-cols-[auto_1fr_1fr_auto] items-center gap-3 px-2 pb-2 border-b border-white/[0.06] text-xs text-white/25 font-normal">
            {isMultiSelect && (
              <input
                type="checkbox"
                checked={allPageSelected}
                ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                onChange={toggleSelectAllPage}
                className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
              />
            )}
            <span>Data · Categoria</span>
            <span>Descrizione</span>
            <span className="text-right">Importo</span>
          </div>

          {paginated.map((t) => (
            <div
              key={t.id}
              onClick={() => isMultiSelect ? toggleId(t.id) : setSelected(t)}
              className={`flex items-center gap-3 px-2 py-3 rounded-xl cursor-pointer transition-colors border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06] ${
                isMultiSelect && selectedIds.has(t.id) ? 'bg-emerald-500/[0.06] border-emerald-500/20' : ''
              }`}
            >
              {/* Checkbox (multi-select) */}
              {isMultiSelect && (
                <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleId(t.id)}
                    className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Date */}
              <span className="flex-shrink-0 text-xs text-white/30 w-10 tabular-nums">
                {new Date(t.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
              </span>

              {/* Category + description */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
                {t.category ? (
                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md w-fit flex-shrink-0" style={{ background: `${t.category.color}20`, color: t.category.color ?? undefined }}>
                    <span className="flex-shrink-0">{t.category.icon}</span>
                    <span className="whitespace-nowrap">{t.category.name}</span>
                    {t.category_locked && <Lock size={10} className="shrink-0 text-amber-400" />}
                  </span>
                ) : (
                  <span className="text-xs text-white/20 flex-shrink-0">—</span>
                )}
                {t.description && (
                  <span className="text-xs text-white/40 truncate">{t.description}</span>
                )}
              </div>

              {/* Amount */}
              <span className={`flex-shrink-0 text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                <PrivacyValue>{t.type === 'income' ? '+' : ''}{formatEur(t.amount)}</PrivacyValue>
              </span>
            </div>
          ))}
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
