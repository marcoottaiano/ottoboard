'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BudgetWithCategory } from '@/types'

export function useBudgets(month: string) {
  // month: YYYY-MM → converto in YYYY-MM-01
  const monthDate = `${month}-01`

  return useQuery<BudgetWithCategory[]>({
    queryKey: ['budgets', month],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('month', monthDate)
      if (error) throw error
      return (data ?? []) as BudgetWithCategory[]
    },
    enabled: !!month,
  })
}
