'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateStr, getIsoWeekday, getPreviousWeekBounds } from '@/lib/dateUtils'

export interface FitnessSummary {
  count: number
  totalKm: number
  totalCalories: number
  totalMinutes: number
}

export interface HabitSummaryItem {
  id: string
  name: string
  icon: string | null
  completionPct: number
  completed: number
  scheduled: number
}

export interface FinanceSummary {
  totalIncome: number
  totalExpense: number
  topCategory: string | null
  /** % change in expenses vs the week before. null when previous week had €0. */
  expenseDelta: number | null
}

export interface WeeklyReviewSummary {
  fitness: FitnessSummary
  habits: HabitSummaryItem[]
  finance: FinanceSummary
  weekStart: string
  weekEnd: string
}

export function useWeeklyReviewSummary() {
  // Compute bounds outside queryFn so they can be part of the queryKey.
  // This ensures React Query caches results per week, not indefinitely.
  const { start: prevStart, end: prevEnd } = getPreviousWeekBounds()
  const prevStartStr = toLocalDateStr(prevStart)
  const prevEndStr = toLocalDateStr(prevEnd)

  return useQuery<WeeklyReviewSummary>({
    queryKey: ['weekly-review-summary', prevStartStr],
    queryFn: async () => {
      const supabase = createClient()

      // Previous-previous week for expense delta
      const pp = getPreviousWeekBounds(prevStart)
      const ppStartStr = toLocalDateStr(pp.start)
      const ppEndStr = toLocalDateStr(pp.end)

      const [
        { data: activities, error: actErr },
        { data: habits, error: habErr },
        { data: completions, error: compErr },
        { data: transactions, error: txErr },
        { data: ppTransactions, error: ppTxErr },
      ] = await Promise.all([
        // Use full ISO strings for TIMESTAMPTZ column to avoid CET off-by-one
        supabase
          .from('activities')
          .select('distance, moving_time, calories')
          .gte('start_date', prevStart.toISOString())
          .lte('start_date', prevEnd.toISOString()),
        supabase
          .from('habits')
          .select('id, name, icon, target_days')
          .eq('archived', false),
        supabase
          .from('habit_completions')
          .select('habit_id, date')
          .gte('date', prevStartStr)
          .lte('date', prevEndStr),
        supabase
          .from('transactions')
          .select('amount, type, category:categories(name)')
          .gte('date', prevStartStr)
          .lte('date', prevEndStr),
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', ppStartStr)
          .lte('date', ppEndStr),
      ])

      if (actErr) throw actErr
      if (habErr) throw habErr
      if (compErr) throw compErr
      if (txErr) throw txErr
      if (ppTxErr) throw ppTxErr

      // ── Fitness ───────────────────────────────────────────────────────────────
      const acts = activities ?? []
      const fitness: FitnessSummary = {
        count: acts.length,
        totalKm: acts.reduce((s, a) => s + (a.distance ?? 0) / 1000, 0),
        totalCalories: acts.reduce((s, a) => s + (a.calories ?? 0), 0),
        totalMinutes: acts.reduce((s, a) => s + Math.round(a.moving_time / 60), 0),
      }

      // ── Habits ────────────────────────────────────────────────────────────────
      const completedSet = new Set(
        (completions ?? []).map((c) => `${c.habit_id}|${c.date}`)
      )
      const habitsResult: HabitSummaryItem[] = []

      for (const h of habits ?? []) {
        const scheduledDates: string[] = []
        const cursor = new Date(prevStart)
        while (cursor <= prevEnd) {
          if ((h.target_days as number[]).includes(getIsoWeekday(cursor))) {
            scheduledDates.push(toLocalDateStr(cursor))
          }
          cursor.setDate(cursor.getDate() + 1)
        }
        if (scheduledDates.length === 0) continue

        const completed = scheduledDates.filter((d) =>
          completedSet.has(`${h.id}|${d}`)
        ).length

        habitsResult.push({
          id: h.id,
          name: h.name,
          icon: h.icon,
          completionPct: Math.round((completed / scheduledDates.length) * 100),
          completed,
          scheduled: scheduledDates.length,
        })
      }

      // ── Finance ───────────────────────────────────────────────────────────────
      const txs = transactions ?? []
      let totalIncome = 0
      let totalExpense = 0
      const categoryExpense: Record<string, number> = {}

      for (const tx of txs) {
        const amount = Number(tx.amount)
        if (tx.type === 'income') {
          totalIncome += amount
        } else {
          totalExpense += amount
          const catRaw = tx.category as unknown
          const catName =
            catRaw && typeof catRaw === 'object' && 'name' in catRaw
              ? (catRaw as { name: string }).name
              : 'Senza categoria'
          categoryExpense[catName] = (categoryExpense[catName] ?? 0) + amount
        }
      }

      const topCategory =
        Object.keys(categoryExpense).sort(
          (a, b) => categoryExpense[b] - categoryExpense[a]
        )[0] ?? null

      const ppExpense = (ppTransactions ?? []).reduce(
        (s, tx) => (tx.type === 'expense' ? s + Number(tx.amount) : s),
        0
      )
      const expenseDelta =
        ppExpense === 0
          ? null
          : Math.round(((totalExpense - ppExpense) / ppExpense) * 100)

      return {
        fitness,
        habits: habitsResult,
        finance: { totalIncome, totalExpense, topCategory, expenseDelta },
        weekStart: prevStartStr,
        weekEnd: prevEndStr,
      }
    },
  })
}
