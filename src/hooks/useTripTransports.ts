'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TripTransport, CreateTransportInput, UpdateTransportInput } from '@/types/travel'

const key = (tripId: string) => ['trip_transports', tripId] as const

export function useTripTransports(tripId: string) {
  return useQuery<TripTransport[]>({
    queryKey: key(tripId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_transports')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripTransport[]
    },
    enabled: !!tripId,
  })
}

export function useCreateTransport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransportInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_transports')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as TripTransport
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key(input.trip_id) })
      const previous = queryClient.getQueryData<TripTransport[]>(key(input.trip_id))
      const temp: TripTransport = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        created_at: new Date().toISOString(),
        prezzo: null, prezzo_tipo: 'per_persona', descrizione: null,
        ...input,
      }
      queryClient.setQueryData<TripTransport[]>(key(input.trip_id), (old) => [...(old ?? []), temp])
      return { previous }
    },
    onSuccess: () => toast.success('Trasporto aggiunto'),
    onError: (_err, input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(input.trip_id), ctx.previous)
      toast.error('Errore durante il salvataggio del trasporto')
    },
    onSettled: (_d, _e, input) => queryClient.invalidateQueries({ queryKey: key(input.trip_id) }),
  })
}

export function useUpdateTransport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      tripId: string
      updates: UpdateTransportInput
    }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_transports').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, updates }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripTransport[]>(key(tripId))
      queryClient.setQueryData<TripTransport[]>(key(tripId), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
      return { previous }
    },
    onSuccess: () => toast.success('Trasporto aggiornato'),
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante la modifica del trasporto')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useDeleteTransport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; tripId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_transports').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripTransport[]>(key(tripId))
      queryClient.setQueryData<TripTransport[]>(key(tripId), (old) =>
        (old ?? []).filter((t) => t.id !== id)
      )
      return { previous }
    },
    onSuccess: () => toast.success('Trasporto eliminato'),
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante l\'eliminazione del trasporto')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}
