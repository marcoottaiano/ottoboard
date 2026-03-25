'use client'

import { AlertTriangle, Calendar, CheckCircle2, TrendingUp } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useTransactions } from '@/hooks/useTransactions'
import { computeSpendingInsights, hasAtLeastOneMonthOfTransactionHistory, SpendingInsight } from '@/lib/finance/spendingInsights'

function iconForInsightType(type: SpendingInsight['type']) {
  if (type === 'spike') return TrendingUp
  if (type === 'expensive-day') return Calendar
  return AlertTriangle
}

export function SpendingInsightsCard() {
  const { data: transactions = [], isLoading: txLoading } = useTransactions({})
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets()

  if (txLoading || budgetsLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-36 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    )
  }

  const today = new Date()
  const hasEnoughHistory = hasAtLeastOneMonthOfTransactionHistory(transactions, today)

  if (!hasEnoughHistory) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Insights</h3>
        <p className="text-sm text-gray-500">Aggiungi più transazioni per sbloccare gli insight</p>
      </div>
    )
  }

  const insights = computeSpendingInsights(transactions, budgets, today)

  if (insights.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Insights</h3>
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 size={14} />
          Nessuna anomalia rilevata
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Insights</h3>
      <div className="space-y-2.5">
        {insights.map((insight, index) => {
          const Icon = iconForInsightType(insight.type)
          const tone = insight.severity === 'warning'
            ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
            : 'border-sky-400/20 bg-sky-400/10 text-sky-200'

          return (
            <div
              key={`${insight.type}-${index}`}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${tone}`}
            >
              <Icon size={15} className="mt-0.5 flex-shrink-0" />
              <p>{insight.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}