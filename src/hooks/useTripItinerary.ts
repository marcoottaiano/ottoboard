'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type {
  TripItineraryItem,
  CreateItineraryItemInput,
  UpdateItineraryItemInput,
} from '@/types/travel'

const key = (tripId: string) => ['trip_itinerary_items', tripId] as const

export function useTripItineraryItems(tripId: string) {
  return useQuery<TripItineraryItem[]>({
    queryKey: key(tripId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripItineraryItem[]
    },
    enabled: !!tripId,
  })
}

export function useAddItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateItineraryItemInput) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trip_itinerary_items')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as TripItineraryItem
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key(input.trip_id) })
      const previous = queryClient.getQueryData<TripItineraryItem[]>(key(input.trip_id))
      const slotItems = (previous ?? []).filter(
        (item) => item.day_date === input.day_date && item.time_slot === input.time_slot
      )
      const nextPosition =
        slotItems.length > 0 ? Math.max(...slotItems.map((i) => i.position)) + 1 : 0
      const temp: TripItineraryItem = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        created_at: new Date().toISOString(),
        accommodation_id: null,
        orario_preciso: null,
        place_id: null,
        ...input,
        position: input.position ?? nextPosition,
      }
      queryClient.setQueryData<TripItineraryItem[]>(key(input.trip_id), (old) => [
        ...(old ?? []),
        temp,
      ])
      return { previous }
    },
    onError: (_err, input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(input.trip_id), ctx.previous)
      toast.error('Errore durante il salvataggio nell\'itinerario')
    },
    onSettled: (_d, _e, input) =>
      queryClient.invalidateQueries({ queryKey: key(input.trip_id) }),
  })
}

export function useMoveItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      tripId: string
      updates: UpdateItineraryItemInput
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('trip_itinerary_items')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, updates }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripItineraryItem[]>(key(tripId))
      queryClient.setQueryData<TripItineraryItem[]>(key(tripId), (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, ...updates } : item))
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante lo spostamento nell\'itinerario')
    },
    onSettled: (_d, _e, { tripId }) =>
      queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useRemoveItineraryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; tripId: string }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trip_itinerary_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripItineraryItem[]>(key(tripId))
      queryClient.setQueryData<TripItineraryItem[]>(key(tripId), (old) =>
        (old ?? []).filter((item) => item.id !== id)
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante la rimozione dall\'itinerario')
    },
    onSettled: (_d, _e, { tripId }) =>
      queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

export function useSetExactTime() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      orario_preciso,
    }: {
      id: string
      tripId: string
      orario_preciso: string | null
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('trip_itinerary_items')
        .update({ orario_preciso })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, tripId, orario_preciso }) => {
      await queryClient.cancelQueries({ queryKey: key(tripId) })
      const previous = queryClient.getQueryData<TripItineraryItem[]>(key(tripId))
      queryClient.setQueryData<TripItineraryItem[]>(key(tripId), (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, orario_preciso } : item))
      )
      return { previous }
    },
    onError: (_err, { tripId }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(tripId), ctx.previous)
      toast.error('Errore durante il salvataggio dell\'orario')
    },
    onSettled: (_d, _e, { tripId }) =>
      queryClient.invalidateQueries({ queryKey: key(tripId) }),
  })
}

/** Delete all itinerary items for a trip with day_date > cutoffDate (exclusive). */
export async function deleteItineraryItemsAfterDate(
  tripId: string,
  cutoffDate: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('trip_itinerary_items')
    .delete()
    .eq('trip_id', tripId)
    .gt('day_date', cutoffDate)
  if (error) throw error
}

/** Fetch itinerary items (with place name) for a trip with day_date > cutoffDate. */
export async function fetchItineraryItemsAfterDate(
  tripId: string,
  cutoffDate: string
): Promise<Array<{ id: string; day_date: string; place_nome: string | null }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trip_itinerary_items')
    .select('id, day_date, trip_places(nome)')
    .eq('trip_id', tripId)
    .gt('day_date', cutoffDate)
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    day_date: row.day_date as string,
    place_nome:
      row.trip_places && typeof row.trip_places === 'object'
        ? (row.trip_places as Record<string, unknown>).nome as string | null
        : null,
  }))
}
