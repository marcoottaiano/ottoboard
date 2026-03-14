'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useMonthStats } from '@/hooks/useMonthStats'
import { TransactionWithCategory } from '@/types'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface CatStat {
  name: string
  icon: string | null
  total: number
}

function getTop3Categories(transactions: TransactionWithCategory[]): CatStat[] {
  const map = new Map<string, CatStat>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const existing = map.get(t.category_id)
    if (existing) {
      existing.total += t.amount
    } else {
      map.set(t.category_id, {
        name: t.category?.name ?? '—',
        icon: t.category?.icon ?? null,
        total: t.amount,
      })
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
}

export function MonthFinanceWidget() {
  const month = getCurrentMonth()
  const { data: transactions = [], isLoading } = useTransactions({ month })
  const { current, delta, isLoading: loadingStats } = useMonthStats(month)

  const monthLabel = new Date(`${month}-01`).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })
  const top3 = getTop3Categories(transactions)
  const maxCat = top3[0]?.total ?? 1
  const balance = current?.balance ?? 0
  const balancePositive = balance >= 0

  if (isLoading || loadingStats) {
    return (
      <div className="p-5 space-y-3 animate-pulse min-h-[200px]">
        <div className="h-4 bg-white/10 rounded w-2/5" />
        <div className="h-8 bg-white/10 rounded w-1/2" />
        <div className="h-4 bg-white/5 rounded w-3/4 mt-1" />
        <div className="space-y-2 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Bilancio</p>
        <p className="text-xs text-gray-600 capitalize">{monthLabel}</p>
      </div>

      {/* Balance — main metric */}
      <div>
        <div className="flex items-end gap-3">
          <span
            className={`text-2xl font-bold ${balancePositive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatEur(balance)}
          </span>
          {delta && (
            <span
              className={`flex items-center gap-0.5 text-xs mb-0.5 ${
                delta.balance > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {delta.balance > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(delta.balance)}% vs mese scorso
            </span>
          )}
        </div>

        {/* Income / Expense secondary row */}
        {current && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-600">
              <span className="text-emerald-500/70">↑</span> {formatEur(current.totalIncome)}
            </span>
            <span className="text-xs text-gray-600">
              <span className="text-red-500/70">↓</span> {formatEur(current.totalExpense)}
            </span>
          </div>
        )}
      </div>

      {/* Top 3 expense categories */}
      {top3.length > 0 ? (
        <div className="space-y-2.5">
          {top3.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </span>
                <span className="text-gray-500">{formatEur(cat.total)}</span>
              </div>
              <div className="h-1 rounded-full bg-white/5">
                <div
                  className="h-1 rounded-full bg-emerald-500/50"
                  style={{ width: `${(cat.total / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600 text-center py-4">Nessuna transazione questo mese</p>
      )}
    </div>
  )
}
