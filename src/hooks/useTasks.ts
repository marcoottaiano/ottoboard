'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'

export function useTasks(projectId: string | null) {
  const queryClient = useQueryClient()

  // Supabase Realtime: invalidate React Query when tasks change remotely (e.g., from webhook)
  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Realtime tasks channel error for project ${projectId}`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])

  return useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function tasksByColumn(tasks: Task[], columnId: string): Task[] {
  return tasks
    .filter((t) => t.column_id === columnId)
    .sort((a, b) => a.position - b.position)
}
