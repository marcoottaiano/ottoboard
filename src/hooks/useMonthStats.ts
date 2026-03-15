'use client'

import { useTransactions } from './useTransactions'
import { MonthStats, MonthStatsDelta } from '@/types'

function calcStats(transactions: { type: string; amount: number }[]): MonthStats {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense }
}

function deltaPercent(current: number, average: number): number {
  if (average === 0) return current > 0 ? 100 : 0
  return Math.round(((current - average) / Math.abs(average)) * 100)
}

function monthKey(date: string): string {
  return date.substring(0, 7)
}

export function useMonthStats(month: string) {
  const { data: currentTxns, isLoading: loadingCurrent } = useTransactions({ month })
  const { data: allTxns, isLoading: loadingAll } = useTransactions()

  const currentStats = currentTxns ? calcStats(currentTxns) : null

  // Calcola media mensile escludendo il mese selezionato
  const avgStats: MonthStats | null = (() => {
    if (!allTxns) return null

    const byMonth = new Map<string, typeof allTxns>()
    for (const txn of allTxns) {
      const key = monthKey(txn.date)
      if (key === month) continue
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(txn)
    }

    const months = Array.from(byMonth.values())
    if (months.length === 0) return null

    const totals = months.map(calcStats)
    return {
      totalIncome: totals.reduce((s, m) => s + m.totalIncome, 0) / totals.length,
      totalExpense: totals.reduce((s, m) => s + m.totalExpense, 0) / totals.length,
      balance: totals.reduce((s, m) => s + m.balance, 0) / totals.length,
    }
  })()

  const delta: MonthStatsDelta | null =
    currentStats && avgStats
      ? {
          income: deltaPercent(currentStats.totalIncome, avgStats.totalIncome),
          expense: deltaPercent(currentStats.totalExpense, avgStats.totalExpense),
          balance: deltaPercent(currentStats.balance, avgStats.balance),
        }
      : null

  return {
    current: currentStats,
    delta,
    isLoading: loadingCurrent || loadingAll,
  }
}
