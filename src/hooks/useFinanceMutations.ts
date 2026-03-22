'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Category, TransactionType, TransactionWithCategory, CategoryType, SpendingType } from '@/types'

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
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] })

      const month = vars.date.substring(0, 7)
      const categories = queryClient.getQueryData<Category[]>(['categories'])
      const category = categories?.find((c) => c.id === vars.category_id) ?? null

      const tempTx: TransactionWithCategory = {
        id: 'temp-' + Date.now(),
        user_id: '',
        amount: vars.amount,
        type: vars.type,
        category_id: vars.category_id,
        description: vars.description ?? null,
        date: vars.date,
        created_at: new Date().toISOString(),
        category,
      }

      // Snapshot and update all matching cache entries
      const queryCache = queryClient.getQueryCache()
      const txQueries = queryCache.findAll({ queryKey: ['transactions'] })
      const snapshots: Array<{ queryKey: unknown[]; data: TransactionWithCategory[] | undefined }> = []

      for (const query of txQueries) {
        const queryKey = query.queryKey as unknown[]
        // Guard: skip entries with no filter object (unexpected key shape)
        if (queryKey.length < 2 || typeof queryKey[1] !== 'object' || queryKey[1] === null) continue
        const filters = queryKey[1] as { month?: string; type?: string; categoryId?: string }
        // Only inject into cache entries that match this transaction's month/type
        const monthMatch = !filters.month || filters.month === month
        const typeMatch = !filters?.type || filters.type === vars.type
        const categoryMatch = !filters?.categoryId || filters.categoryId === vars.category_id
        if (monthMatch && typeMatch && categoryMatch) {
          const prev = queryClient.getQueryData<TransactionWithCategory[]>(queryKey)
          snapshots.push({ queryKey, data: prev })
          if (prev) {
            queryClient.setQueryData<TransactionWithCategory[]>(queryKey, [tempTx, ...prev])
          }
        }
      }

      return { snapshots }
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const { queryKey, data } of context.snapshots) {
          queryClient.setQueryData(queryKey, data)
        }
      }
    },
    onSettled: () => {
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

interface UpdateCategoryInput {
  id: string
  name?: string
  icon?: string
  color?: string
  spending_type?: SpendingType | null
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCategoryInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('categories').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
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

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
