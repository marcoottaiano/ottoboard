'use client'

import { useTransactions } from '@/hooks/useTransactions'
import { TransactionType, TransactionWithCategory } from '@/types'
import { useState } from 'react'
import { TransactionEditModal } from './TransactionEditModal'

const PAGE_SIZE = 20

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

  const { data: transactions, isLoading } = useTransactions({
    month,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })

  const filtered = (transactions ?? []).filter((t) =>
    !search || t.description?.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-sm font-medium text-gray-400 flex-1">Transazioni</h3>

        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Cerca..."
          className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-300 placeholder:text-gray-600 focus:outline-none w-32"
        />

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TransactionType | 'all'); setPage(0) }}
          className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-gray-300 focus:outline-none"
        >
          <option value="all">Tutte</option>
          <option value="income">Entrate</option>
          <option value="expense">Uscite</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-white/5 rounded animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="py-10 text-center text-gray-600 text-sm">Nessuna transazione trovata</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-600 border-b border-white/5">
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
                  onClick={() => setSelected(t)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                >
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
