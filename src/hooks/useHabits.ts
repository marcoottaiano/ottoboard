'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toLocalDateStr, getIsoWeekday } from '@/lib/dateUtils'
import type { Habit, HabitWithStats, CreateHabitInput, UpdateHabitInput } from '@/types/habits'

export const HABITS_KEY = ['habits']
export const COMPLETIONS_KEY = (year: number) => ['habit-completions', year]

// ─── Streak calculation ────────────────────────────────────────────────────────

export function calcStreak(targetDays: number[], completions: Set<string>, todayStr: string): number {
  if (targetDays.length === 0) return 0

  const [ty, tm, td] = todayStr.split('-').map(Number)
  const today = new Date(ty, tm - 1, td)

  const todayIso = getIsoWeekday(today)
  const todayCompleted = completions.has(todayStr)

  // If today is scheduled but not yet done, start checking from yesterday
  const cursor = new Date(today)
  if (targetDays.includes(todayIso) && !todayCompleted) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  for (let i = 0; i < 400; i++) {
    const dayStr = toLocalDateStr(cursor)
    const iso = getIsoWeekday(cursor)

    if (targetDays.includes(iso)) {
      if (completions.has(dayStr)) {
        streak++
      } else {
        break
      }
    }
    // Non-target days are skipped without breaking the streak

    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export function useHabits() {
  return useQuery<HabitWithStats[]>({
    queryKey: HABITS_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const todayStr = toLocalDateStr(new Date())

      const since = new Date()
      since.setDate(since.getDate() - 400)
      const sinceStr = toLocalDateStr(since)

      const [{ data: habits, error: habitsError }, { data: completions, error: compError }] =
        await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .eq('archived', false)
            .order('created_at', { ascending: true }),
          supabase
            .from('habit_completions')
            .select('habit_id, date')
            .gte('date', sinceStr),
        ])

      if (habitsError) throw habitsError
      if (compError) throw compError

      const byHabit = new Map<string, Set<string>>()
      for (const c of completions ?? []) {
        if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set())
        byHabit.get(c.habit_id)!.add(c.date)
      }

      return (habits ?? []).map((h: Habit) => {
        const dates = byHabit.get(h.id) ?? new Set<string>()
        return {
          ...h,
          streak: calcStreak(h.target_days, dates, todayStr),
          completedToday: dates.has(todayStr),
        }
      })
    },
  })
}

export function useHabitCompletions(year: number) {
  return useQuery<Record<string, number>>({
    queryKey: COMPLETIONS_KEY(year),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('habit_completions')
        .select('habit_id, date')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
      if (error) throw error

      const byDate: Record<string, number> = {}
      for (const c of data ?? []) {
        byDate[c.date] = (byDate[c.date] ?? 0) + 1
      }
      return byDate
    },
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function invalidateHabits(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: HABITS_KEY })
}

export function useCreateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('habits').insert(input)
      if (error) throw error
    },
    onSuccess: () => invalidateHabits(queryClient),
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateHabitInput & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('habits').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateHabits(queryClient),
  })
}

export function useArchiveHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('habits').update({ archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateHabits(queryClient),
  })
}

export function useToggleCompletion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('date', date)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase.from('habit_completions').delete().eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('habit_completions').insert({ habit_id: habitId, date })
        if (error) throw error
      }
    },
    onMutate: async ({ habitId }) => {
      // Cancel in-flight queries for both caches touched by this mutation
      await queryClient.cancelQueries({ queryKey: HABITS_KEY })
      await queryClient.cancelQueries({ queryKey: COMPLETIONS_KEY(new Date().getFullYear()) })

      const previous = queryClient.getQueryData<HabitWithStats[]>(HABITS_KEY)

      // Only flip completedToday — streak is recalculated correctly in onSettled
      queryClient.setQueryData<HabitWithStats[]>(HABITS_KEY, (old) =>
        (old ?? []).map((h) =>
          h.id === habitId ? { ...h, completedToday: !h.completedToday } : h
        )
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(HABITS_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HABITS_KEY })
      queryClient.invalidateQueries({ queryKey: COMPLETIONS_KEY(new Date().getFullYear()) })
    },
  })
}
