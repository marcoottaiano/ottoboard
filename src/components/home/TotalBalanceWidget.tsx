'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { PrivacyValue } from '@/components/ui/PrivacyValue'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

export function TotalBalanceWidget({ bare = false }: { bare?: boolean }) {
  const { data: transactions = [], isLoading } = useTransactions({})

  const skeletonClass = bare
    ? 'p-5 space-y-3 animate-pulse min-h-[160px]'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 space-y-3 animate-pulse min-h-[160px]'

  if (isLoading) {
    return (
      <div className={skeletonClass}>
        <div className="h-4 bg-white/10 rounded w-2/5" />
        <div className="h-8 bg-white/10 rounded w-1/2 mt-2" />
        <div className="h-4 bg-white/5 rounded w-3/4 mt-1" />
      </div>
    )
  }

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const balance = totalIncome - totalExpense
  const balancePositive = balance >= 0

  const emptyClass = bare
    ? 'p-5 flex items-center justify-center text-gray-600 min-h-[160px] text-sm'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 flex items-center justify-center text-gray-600 min-h-[160px] text-sm'

  const outerClass = bare
    ? 'p-5 flex flex-col gap-4'
    : 'rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4'

  if (transactions.length === 0) {
    return (
      <div className={emptyClass}>
        Nessuna transazione registrata
      </div>
    )
  }

  return (
    <div className={outerClass}>
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo Totale</p>
        <p className="text-xs text-gray-600">{transactions.length} transazioni registrate</p>
      </div>

      {/* Balance */}
      <div>
        <div className="flex items-center gap-2">
          {balancePositive ? (
            <TrendingUp size={18} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <TrendingDown size={18} className="text-red-400 flex-shrink-0" />
          )}
          <span
            className={`text-2xl font-bold ${balancePositive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            <PrivacyValue>{formatEur(balance)}</PrivacyValue>
          </span>
        </div>

        {/* Income / Expense breakdown */}
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Entrate</p>
            <p className="text-sm font-medium text-emerald-400/80"><PrivacyValue>{formatEur(totalIncome)}</PrivacyValue></p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Uscite</p>
            <p className="text-sm font-medium text-red-400/80"><PrivacyValue>{formatEur(totalExpense)}</PrivacyValue></p>
          </div>
        </div>
      </div>

      {/* Progress bar income vs expense */}
      {totalIncome > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500/60"
              style={{ width: `${Math.min((totalIncome / (totalIncome + totalExpense)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Entrate {Math.round((totalIncome / (totalIncome + totalExpense)) * 100)}%</span>
            <span>Uscite {Math.round((totalExpense / (totalIncome + totalExpense)) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
