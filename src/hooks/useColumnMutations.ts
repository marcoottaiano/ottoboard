'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface CreateColumnInput {
  project_id: string
  name: string
  color?: string
  position: number
}

interface UpdateColumnInput {
  id: string
  name?: string
  color?: string
}

interface ReorderColumnsInput {
  projectId: string
  columns: Array<{ id: string; position: number }>
}

export function useCreateColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateColumnInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('columns')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['columns', input.project_id] })
    },
  })
}

export function useUpdateColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateColumnInput & { project_id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('columns').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['columns', input.project_id] })
    },
  })
}

export function useDeleteColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('columns').delete().eq('id', id)
      if (error) throw error
      return project_id
    },
    onSuccess: (project_id) => {
      queryClient.invalidateQueries({ queryKey: ['columns', project_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', project_id] })
    },
  })
}

export function useReorderColumns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ columns }: ReorderColumnsInput) => {
      const supabase = createClient()
      // Use individual UPDATE calls — upsert would overwrite other fields with NULL
      for (const { id, position } of columns) {
        const { error } = await supabase
          .from('columns')
          .update({ position })
          .eq('id', id)
        if (error) throw error
      }
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['columns', input.projectId] })
    },
  })
}
