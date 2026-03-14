'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'

export function useTasks(projectId: string | null) {
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
