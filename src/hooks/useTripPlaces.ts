'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TripPlace, CreatePlaceInput, UpdatePlaceInput } from '@/types/travel'

const key = (tripId: string) => ['trip_places', tripId] as const

export function useTripPlaces(tripId: string) {
  return useQuery<TripPlace[]>({
    queryKey: key(tripId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_places')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripPlace[]
    },
    enabled: !!tripId,
  })
}

export function useCreatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePlaceInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_places')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as TripPlace
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key(input.trip_id) })
      const previous = queryClient.getQueryData<TripPlace[]>(key(input.trip_id))
      const temp: TripPlace = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        created_at: new Date().toISOString(),
        maps_url: null, lon: null, lat: null, descrizione: null, prezzo_per_persona: null,
        ...input,
      }
      queryClient.setQueryData<TripPlace[]>(key(input.trip_id), (old) => [...(old ?? []), temp])
      return { previous }
    },
    onSuccess: () => toast.success('Luogo aggiunto'),
    onError: (_err, input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(input.trip_id), ctx.previous)
      toast.error('Errore durante il salvataggio del luogo')
    },
    onSettled: (_d, _e, input) => queryClient.invalidateQueries({ queryKey: key(input.trip_id) }),
  })
}

export function useUpdatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; tripId: string; updates: UpdatePlaceInput }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_places').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, updates }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripPlace[]>(key(tripId))
      queryClient.setQueryData<TripPlace[]>(key(tripId), (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, ...updates } : p))
      )
      return { previous }
    },
    onSuccess: () => toast.success('Luogo aggiornato'),
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante la modifica del luogo')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; tripId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_places').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripPlace[]>(key(tripId))
      queryClient.setQueryData<TripPlace[]>(key(tripId), (old) => (old ?? []).filter((p) => p.id !== id))
      return { previous }
    },
    onSuccess: () => toast.success('Luogo eliminato'),
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante l\'eliminazione del luogo')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}
