'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TransactionType, TransactionWithCategory } from '@/types'

export interface TransactionFilters {
  month?: string      // formato YYYY-MM
  type?: TransactionType
  categoryId?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionWithCategory[]>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.month) {
        const [year, month] = filters.month.split('-').map(Number)
        const start = new Date(year, month - 1, 1).toISOString().slice(0, 10)
        const end = new Date(year, month, 0).toISOString().slice(0, 10)
        query = query.gte('date', start).lte('date', end)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as TransactionWithCategory[]
    },
  })
}
