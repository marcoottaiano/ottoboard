'use client'

import { createClient } from '@/lib/supabase/client'
import { Activity, ActivityType } from '@/types'
import { useQuery } from '@tanstack/react-query'

export interface ActivityFilters {
  type?: ActivityType
  after?: string // ISO date
  before?: string // ISO date
  limit?: number
}

export function useActivities(filters?: ActivityFilters) {
  return useQuery<Activity[]>({
    queryKey: ['activities', filters],
    queryFn: async () => {
      const supabase = createClient()

      let query = supabase
        .from('activities')
        .select('*')
        .order('start_date', { ascending: false })

      if (filters?.type) query = query.eq('type', filters.type)
      if (filters?.after) query = query.gte('start_date', filters.after)
      if (filters?.before) query = query.lte('start_date', filters.before)
      if (filters?.limit) query = query.limit(filters.limit)

      const { data, error } = await query

      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}
