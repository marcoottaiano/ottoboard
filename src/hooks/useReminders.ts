'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Reminder, CreateReminderInput, UpdateReminderInput, ReminderRecurrence } from '@/types'
import { toast } from 'sonner'

const PENDING_KEY = ['reminders', 'pending']
const COMPLETED_KEY = ['reminders', 'completed']

function calcNextDueDate(dueDate: string, recurrence: ReminderRecurrence): string {
  // Parse as local date to avoid UTC offset bug
  const parts = dueDate.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])

  switch (recurrence) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly': {
      const origDay = d.getDate()
      d.setDate(1)                          // prevent overflow during month change
      d.setMonth(d.getMonth() + 1)          // advance month safely
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(origDay, lastDayOfMonth))  // clamp to last valid day
      break
    }
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1)
      break
  }

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function usePendingReminders() {
  return useQuery<Reminder[]>({
    queryKey: PENDING_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('completed', false)
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as Reminder[]
    },
  })
}

export function useCompletedReminders() {
  return useQuery<Reminder[]>({
    queryKey: COMPLETED_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('completed', true)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Reminder[]
    },
  })
}

function invalidateBoth(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PENDING_KEY })
  queryClient.invalidateQueries({ queryKey: COMPLETED_KEY })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('reminders').insert(input)
      if (error) throw error
    },
    onSuccess: () => invalidateBoth(queryClient),
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateReminderInput & { id: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('reminders').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateBoth(queryClient),
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateBoth(queryClient),
  })
}

export function useCompleteReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reminder: Reminder) => {
      const supabase = createClient()
      const now = new Date().toISOString()

      // Mark as completed
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true, completed_at: now })
        .eq('id', reminder.id)
      if (error) throw error

      // If recurring, create next occurrence; rollback completion if insert fails
      if (reminder.recurrence) {
        const nextDue = calcNextDueDate(reminder.due_date, reminder.recurrence)
        const { error: createError } = await supabase.from('reminders').insert({
          title: reminder.title,
          notes: reminder.notes,
          due_date: nextDue,
          due_time: reminder.due_time,
          priority: reminder.priority,
          recurrence: reminder.recurrence,
        })
        if (createError) {
          // Roll back the completion to preserve the recurrence chain
          await supabase
            .from('reminders')
            .update({ completed: false, completed_at: null })
            .eq('id', reminder.id)
          throw createError
        }
      }
    },
    onMutate: async (reminder) => {
      await queryClient.cancelQueries({ queryKey: PENDING_KEY })
      const previous = queryClient.getQueryData<Reminder[]>(PENDING_KEY)
      const previousCompleted = queryClient.getQueryData<Reminder[]>(COMPLETED_KEY)
      const now = new Date().toISOString()
      queryClient.setQueryData<Reminder[]>(PENDING_KEY, (old) =>
        (old ?? []).filter((r) => r.id !== reminder.id)
      )
      queryClient.setQueryData<Reminder[]>(COMPLETED_KEY, (old) =>
        [{ ...reminder, completed: true, completed_at: now }, ...(old ?? [])]
      )
      return { previous, previousCompleted }
    },
    onError: (_err, _reminder, context) => {
      if (context?.previous) queryClient.setQueryData(PENDING_KEY, context.previous)
      if (context?.previousCompleted) queryClient.setQueryData(COMPLETED_KEY, context.previousCompleted)
      toast.error('Operazione non riuscita, riprova')
    },
    onSettled: () => invalidateBoth(queryClient),
  })
}

export function useReopenReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('reminders')
        .update({ completed: false, completed_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateBoth(queryClient),
  })
}
