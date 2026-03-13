'use client'

import { useTransactions } from './useTransactions'
import { MonthStats, MonthStatsDelta } from '@/types'

function prevMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function calcStats(transactions: { type: string; amount: number }[]): MonthStats {
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense }
}

function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

export function useMonthStats(month: string) {
  const { data: current, isLoading: loadingCurrent } = useTransactions({ month })
  const { data: prev, isLoading: loadingPrev } = useTransactions({ month: prevMonth(month) })

  const currentStats = current ? calcStats(current) : null
  const prevStats = prev ? calcStats(prev) : null

  const delta: MonthStatsDelta | null =
    currentStats && prevStats
      ? {
          income: deltaPercent(currentStats.totalIncome, prevStats.totalIncome),
          expense: deltaPercent(currentStats.totalExpense, prevStats.totalExpense),
          balance: deltaPercent(currentStats.balance, prevStats.balance),
        }
      : null

  return {
    current: currentStats,
    delta,
    isLoading: loadingCurrent || loadingPrev,
  }
}
