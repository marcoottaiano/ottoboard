'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BudgetWithCategory } from '@/types'

export function useBudgets(month?: string) {
  const monthDate = month ? `${month}-01` : null

  return useQuery<BudgetWithCategory[]>({
    queryKey: ['budgets', month ?? 'all'],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('budgets')
        .select('*, category:categories(*)')

      if (monthDate) {
        query = query.eq('month', monthDate)
      } else {
        query = query.order('month', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as BudgetWithCategory[]
    },
  })
}
