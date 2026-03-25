'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FinancialGoal, CreateFinancialGoalInput, UpdateFinancialGoalInput } from '@/types'

const QUERY_KEY = ['financial-goals']

export function useFinancialGoals() {
  return useQuery<FinancialGoal[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as FinancialGoal[]
    },
  })
}

export function useCreateFinancialGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateFinancialGoalInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('financial_goals').insert(input)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateFinancialGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateFinancialGoalInput & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('financial_goals')
        .update(input)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteFinancialGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useCompleteFinancialGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('financial_goals')
        .update({ completed })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useReorderFinancialGoals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newOrder: { id: string; position: number }[]) => {
      const supabase = createClient()
      await Promise.all(
        newOrder.map(({ id, position }) =>
          supabase
            .from('financial_goals')
            .update({ position })
            .eq('id', id)
            .then(({ error }) => {
              if (error) throw error
            })
        )
      )
    },
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<FinancialGoal[]>(QUERY_KEY)
      queryClient.setQueryData<FinancialGoal[]>(QUERY_KEY, (old = []) => {
        const posMap = new Map(newOrder.map(({ id, position }) => [id, position]))
        return [...old]
          .map((g) => (posMap.has(g.id) ? { ...g, position: posMap.get(g.id)! } : g))
          .sort((a, b) => a.position - b.position)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
