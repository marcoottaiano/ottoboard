'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calcBodyComposition } from '@/lib/bodyComposition'
import type {
  BodyMeasurement,
  CreateBodyMeasurementInput,
  UserBodyProfile,
} from '@/types'

// ─── Query ────────────────────────────────────────────────────────────────────

export function useBodyMeasurements() {
  return useQuery<BodyMeasurement[]>({
    queryKey: ['body_measurements'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('measured_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUserBodyProfile() {
  return useQuery<UserBodyProfile | null>({
    queryKey: ['user_body_profile'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_body_profile')
        .select('*')
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateBodyMeasurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBodyMeasurementInput) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Recupera il profilo per il calcolo
      const { data: profile } = await supabase
        .from('user_body_profile')
        .select('*')
        .maybeSingle()

      const composition = profile
        ? calcBodyComposition(input, profile)
        : { body_fat_pct: null, fat_mass_kg: null, lean_mass_kg: null }

      const { data, error } = await supabase
        .from('body_measurements')
        .insert({ ...input, user_id: user.id, ...composition })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_measurements'] })
    },
  })
}

export function useUpdateBodyMeasurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateBodyMeasurementInput> & { id: string }) => {
      const supabase = createClient()

      // Ricalcola composizione se vengono aggiornate pliche o peso
      const hasSkinfoldOrWeight = Object.keys(updates).some(
        k => k.startsWith('skinfold_') || k === 'weight_kg'
      )

      let composition = {}
      if (hasSkinfoldOrWeight) {
        const { data: profile } = await supabase
          .from('user_body_profile')
          .select('*')
          .maybeSingle()
        if (profile) {
          const { data: existing } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('id', id)
            .single()
          const merged = { ...existing, ...updates } as CreateBodyMeasurementInput
          composition = calcBodyComposition(merged, profile)
        }
      }

      const { error } = await supabase
        .from('body_measurements')
        .update({ ...updates, ...composition })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_measurements'] })
    },
  })
}

export function useDeleteBodyMeasurement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('body_measurements')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body_measurements'] })
    },
  })
}

export function useUpsertUserBodyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<UserBodyProfile, 'user_id'>) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_body_profile')
        .upsert({ ...input, user_id: user.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_body_profile'] })
    },
  })
}
