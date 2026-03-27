'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { TripAccommodation, CreateAccommodationInput, UpdateAccommodationInput } from '@/types/travel'

const key = (tripId: string) => ['trip_accommodations', tripId] as const

/** True if [aStart, aEnd) overlaps with [bStart, bEnd) using ISO date strings. */
export function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart
}

/** Returns the first accommodation in `others` that overlaps with the given interval. */
export function findOverlap(
  checkIn: string,
  checkOut: string,
  others: TripAccommodation[],
  excludeId?: string
): TripAccommodation | undefined {
  return others.find(
    (a) => a.id !== excludeId && datesOverlap(checkIn, checkOut, a.check_in, a.check_out)
  )
}

export function useTripAccommodations(tripId: string) {
  return useQuery<TripAccommodation[]>({
    queryKey: key(tripId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('check_in', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripAccommodation[]
    },
    enabled: !!tripId,
  })
}

export function useCreateAccommodation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccommodationInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_accommodations')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as TripAccommodation
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key(input.trip_id) })
      const previous = queryClient.getQueryData<TripAccommodation[]>(key(input.trip_id))
      const temp: TripAccommodation = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        created_at: new Date().toISOString(),
        prezzo_totale: null, link_booking: null, maps_url: null,
        lat: null, lon: null, includi_in_stima: true,
        ...input,
      }
      queryClient.setQueryData<TripAccommodation[]>(key(input.trip_id), (old) => [...(old ?? []), temp])
      return { previous }
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(input.trip_id), ctx.previous)
      toast.error('Errore durante il salvataggio dell\'alloggio')
    },
    onSettled: (_d, _e, input) => queryClient.invalidateQueries({ queryKey: key(input.trip_id) }),
  })
}

export function useUpdateAccommodation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      tripId: string
      updates: UpdateAccommodationInput
    }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_accommodations').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, updates }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripAccommodation[]>(key(tripId))
      queryClient.setQueryData<TripAccommodation[]>(key(tripId), (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, ...updates } : a))
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante la modifica dell\'alloggio')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useDeleteAccommodation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; tripId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_accommodations').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripAccommodation[]>(key(tripId))
      queryClient.setQueryData<TripAccommodation[]>(key(tripId), (old) =>
        (old ?? []).filter((a) => a.id !== id)
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante l\'eliminazione dell\'alloggio')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useToggleIncludiInStima() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      includi_in_stima,
    }: {
      id: string
      tripId: string
      includi_in_stima: boolean
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('trip_accommodations')
        .update({ includi_in_stima })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, includi_in_stima }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripAccommodation[]>(key(tripId))
      queryClient.setQueryData<TripAccommodation[]>(key(tripId), (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, includi_in_stima } : a))
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante l\'aggiornamento')
    },
    onSettled: (_d, _e, { tripId }) => queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}
