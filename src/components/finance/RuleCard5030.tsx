'use client'

import { useTransactions } from '@/hooks/useTransactions'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  month: string
}

interface RuleRow {
  key: string
  label: string
  description: string
  target: number
  actual: number
  color: string
  targetPct: number
}

export function RuleCard5030({ month }: Props) {
  const { data: transactions, isLoading } = useTransactions({ month })

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-48 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded" />)}
        </div>
      </div>
    )
  }

  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const needsTotal = (transactions ?? [])
    .filter((t) => t.type === 'expense' && t.category?.spending_type === 'needs')
    .reduce((s, t) => s + t.amount, 0)

  const wantsTotal = (transactions ?? [])
    .filter((t) => t.type === 'expense' && t.category?.spending_type === 'wants')
    .reduce((s, t) => s + t.amount, 0)

  const savingsActual = Math.max(0, totalIncome - needsTotal - wantsTotal)

  const uncategorized = (transactions ?? [])
    .filter((t) => t.type === 'expense' && !t.category?.spending_type)
    .reduce((s, t) => s + t.amount, 0)

  if (totalIncome === 0) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Regola 50/30/20</h3>
        <p className="text-xs text-gray-600 mb-4">
          Gestisci le spese: <strong className="text-gray-500">50%</strong> necessarie ·{' '}
          <strong className="text-gray-500">30%</strong> accessorie ·{' '}
          <strong className="text-gray-500">20%</strong> risparmio
        </p>
        <div className="flex items-center justify-center h-20 text-gray-600 text-sm">
          Aggiungi entrate per vedere l&apos;analisi
        </div>
      </div>
    )
  }

  const rows: RuleRow[] = [
    {
      key: 'needs',
      label: 'Necessarie',
      description: 'Affitto, cibo, trasporti, salute',
      target: totalIncome * 0.5,
      actual: needsTotal,
      color: 'bg-blue-500',
      targetPct: 50,
    },
    {
      key: 'wants',
      label: 'Accessorie',
      description: 'Svago, abbonamenti, shopping',
      target: totalIncome * 0.3,
      actual: wantsTotal,
      color: 'bg-purple-500',
      targetPct: 30,
    },
    {
      key: 'savings',
      label: 'Risparmio',
      description: 'Entrate − necessarie − accessorie',
      target: totalIncome * 0.2,
      actual: savingsActual,
      color: 'bg-emerald-500',
      targetPct: 20,
    },
  ]

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-400">Regola 50/30/20</h3>
        <span className="text-xs text-gray-600">Entrate: {formatEur(totalIncome)}</span>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Distribuisci le entrate: <span className="text-blue-400">50%</span> necessarie ·{' '}
        <span className="text-purple-400">30%</span> accessorie ·{' '}
        <span className="text-emerald-400">20%</span> risparmio
      </p>

      <div className="space-y-4">
        {rows.map((row) => {
          const pct = row.target > 0 ? (row.actual / row.target) * 100 : 0
          const isOver = row.actual > row.target
          const barColor = isOver
            ? 'bg-red-500'
            : pct >= 85
            ? 'bg-yellow-500'
            : row.color

          return (
            <div key={row.key}>
              <div className="flex items-start justify-between mb-1.5 gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-300">
                    {row.targetPct}% — {row.label}
                  </span>
                  <span className="text-xs text-gray-600 ml-2 hidden sm:inline">{row.description}</span>
                </div>
                <div className="text-xs text-right flex-shrink-0">
                  <span className={isOver ? 'text-red-400 font-medium' : 'text-gray-300'}>
                    {formatEur(row.actual)}
                  </span>
                  <span className="text-gray-600 mx-1">/</span>
                  <span className="text-gray-500">{formatEur(row.target)}</span>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-xs text-gray-600">
                  {pct.toFixed(0)}% del target
                  {isOver && (
                    <span className="text-red-400 ml-1">↑ +{formatEur(row.actual - row.target)}</span>
                  )}
                  {!isOver && row.key === 'savings' && pct < 100 && (
                    <span className="text-emerald-600 ml-1">↓ {formatEur(row.target - row.actual)} in meno del previsto</span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {uncategorized > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-xs text-yellow-500/80">
            ⚠️ {formatEur(uncategorized)} in spese senza tipo assegnato — vai nelle categorie e imposta se sono &quot;necessarie&quot; o &quot;accessorie&quot; per un&apos;analisi precisa
          </p>
        </div>
      )}
    </div>
  )
}
