'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type WidgetType = 'last-activity' | 'week-stats' | 'month-finance' | 'total-balance' | 'kanban-column' | 'reminders' | 'habits'

export interface WidgetConfig {
  projectId?: string
  columnId?: string
}

export interface DashboardWidget {
  id: string
  type: WidgetType
  position: number
  config: WidgetConfig
}

const QUERY_KEY = ['dashboard-widgets']

export function useDashboardWidgets() {
  return useQuery<DashboardWidget[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('id, type, position, config')
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as DashboardWidget[]
    },
  })
}

export function useSeedDefaultWidgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('dashboard_widgets').insert([
        { type: 'last-activity', position: 0, config: {} },
        { type: 'month-finance', position: 1, config: {} },
        { type: 'week-stats', position: 2, config: {} },
      ])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useAddWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ type, config }: { type: WidgetType; config: WidgetConfig }) => {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('dashboard_widgets')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
      const maxPos = (existing?.[0]?.position as number | undefined) ?? -1
      const { error } = await supabase
        .from('dashboard_widgets')
        .insert({ type, position: maxPos + 1, config })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRemoveWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('dashboard_widgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useReorderWidgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const supabase = createClient()
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('dashboard_widgets').update({ position: i }).eq('id', id)
        )
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateWidgetConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: WidgetConfig }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({ config })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
