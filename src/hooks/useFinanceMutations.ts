'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TransactionType, CategoryType, SpendingType } from '@/types'

// ─── Transactions ──────────────────────────────────────────────────────────────

interface CreateTransactionInput {
  amount: number
  type: TransactionType
  category_id: string
  description?: string
  date: string
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('transactions').insert({ ...input, user_id: user.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

interface UpdateTransactionInput {
  id: string
  amount?: number
  type?: TransactionType
  category_id?: string
  description?: string
  date?: string
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTransactionInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('transactions').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}

// ─── Categories ────────────────────────────────────────────────────────────────

interface CreateCategoryInput {
  name: string
  icon?: string
  color: string
  type: CategoryType
  spending_type?: SpendingType | null
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...input, user_id: user.id })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// ─── Budgets ───────────────────────────────────────────────────────────────────

interface UpsertBudgetInput {
  category_id: string
  amount: number
  month: string  // YYYY-MM
}

export function useUpsertBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ month, ...rest }: UpsertBudgetInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const monthDate = `${month}-01`
      const { error } = await supabase
        .from('budgets')
        .upsert({ ...rest, month: monthDate, user_id: user.id }, { onConflict: 'user_id,category_id,month' })
      if (error) throw error
    },
    onSuccess: (_, { month }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', month] })
    },
  })
}
