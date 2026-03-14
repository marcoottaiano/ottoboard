'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TaskPriority } from '@/types'

interface CreateTaskInput {
  project_id: string
  column_id: string
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string
  labels?: string[]
  position: number
}

interface UpdateTaskInput {
  id: string
  project_id: string
  title?: string
  description?: string | null
  priority?: TaskPriority | null
  due_date?: string | null
  labels?: string[]
  column_id?: string
}

interface MoveTaskInput {
  id: string
  project_id: string
  column_id: string
  position: number
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...input, user_id: user.id, labels: input.labels ?? [] })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', input.project_id] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id, ...updates }: UpdateTaskInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').update(updates).eq('id', id)
      if (error) throw error
      return project_id
    },
    onSuccess: (project_id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', project_id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      return project_id
    },
    onSuccess: (project_id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', project_id] })
    },
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id, column_id, position }: MoveTaskInput) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ column_id, position })
        .eq('id', id)
      if (error) throw error
      return project_id
    },
    onSuccess: (project_id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', project_id] })
    },
  })
}
