'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Column } from '@/types'

export function useColumns(projectId: string | null) {
  return useQuery<Column[]>({
    queryKey: ['columns', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', projectId!)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as Column[]
    },
  })
}
