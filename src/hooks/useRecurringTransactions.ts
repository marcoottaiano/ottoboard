import { createClient } from '@/lib/supabase/client'
import { RecurringFrequency, RecurringTransaction } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function advanceDate(dateStr: string, frequency: RecurringFrequency): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (frequency === 'weekly') return toLocalDateStr(new Date(y, m - 1, d + 7))
  if (frequency === 'monthly') return toLocalDateStr(new Date(y, m, d))
  return toLocalDateStr(new Date(y + 1, m - 1, d)) // yearly
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useRecurringTransactions() {
  const supabase = createClient()
  return useQuery<RecurringTransaction[]>({
    queryKey: ['recurring_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Auto-process due recurring transactions on page mount ────────────────────

export function useProcessDueRecurring() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    async function process() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = toLocalDateStr(new Date())

      const { data: due } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('next_due_date', today)

      if (!due || due.length === 0) return

      for (const recurring of due) {
        let nextDate: string = recurring.next_due_date

        // Insert one transaction per missed period
        while (nextDate <= today) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            amount: recurring.amount,
            type: recurring.type,
            category_id: recurring.category_id,
            description: recurring.description,
            date: nextDate,
          })
          nextDate = advanceDate(nextDate, recurring.frequency as RecurringFrequency)
        }

        await supabase
          .from('recurring_transactions')
          .update({ next_due_date: nextDate })
          .eq('id', recurring.id)
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] })
    }

    process()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// ─── Mutations ────────────────────────────────────────────────────────────────

type RecurringPayload = {
  amount: number
  type: 'income' | 'expense'
  category_id: string
  description?: string | null
  frequency: RecurringFrequency
  next_due_date: string
}

export function useCreateRecurring() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecurringPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('recurring_transactions').insert({
        ...payload,
        user_id: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  })
}

export function useUpdateRecurring() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<RecurringPayload> & { id: string }) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  })
}

export function useToggleRecurring() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  })
}

export function useDeleteRecurring() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  })
}
