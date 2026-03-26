'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Trip, CreateTripInput, UpdateTripInput } from '@/types/travel'

const TRIPS_KEY = ['trips'] as const

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validateCoverFile(file: File): void {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error(`Formato non supportato. Usa: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`)
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Il file supera i 5 MB')
  }
}

/** Estrae il path relativo al bucket `trip-covers` dall'URL pubblico. */
function extractStoragePath(publicUrl: string): string | null {
  const marker = '/trip-covers/'
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  return publicUrl.slice(idx + marker.length)
}

/** Tenta di cancellare un file storage — non lancia errori (cleanup best-effort). */
async function removeStorageFile(supabase: ReturnType<typeof createClient>, path: string) {
  await supabase.storage.from('trip-covers').remove([path])
}

/** Carica un file nel bucket `trip-covers` e restituisce la URL pubblica. */
async function uploadCoverFile(
  supabase: ReturnType<typeof createClient>,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('Utente non autenticato')

  validateCoverFile(file)

  const ext = file.name.split('.').pop()!.toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('trip-covers')
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('trip-covers').getPublicUrl(path)
  return { path, publicUrl: urlData.publicUrl }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useTrips() {
  return useQuery<Trip[]>({
    queryKey: TRIPS_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Trip[]
    },
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      input,
      coverFile,
    }: {
      input: CreateTripInput
      coverFile?: File | null
    }) => {
      const supabase = createClient()
      let uploadedPath: string | null = null
      let coverPhotoUrl: string | null = null

      if (coverFile) {
        const result = await uploadCoverFile(supabase, coverFile)
        uploadedPath = result.path
        coverPhotoUrl = result.publicUrl
      }

      const { data, error } = await supabase
        .from('trips')
        .insert({ ...input, cover_photo_url: coverPhotoUrl })
        .select()
        .single()

      if (error) {
        // Cleanup uploaded file if DB insert fails
        if (uploadedPath) await removeStorageFile(supabase, uploadedPath)
        throw error
      }

      return data as Trip
    },
    onMutate: async ({ input }) => {
      await queryClient.cancelQueries({ queryKey: TRIPS_KEY })
      const previous = queryClient.getQueryData<Trip[]>(TRIPS_KEY)
      // Optimistic placeholder — replaced by real data on onSettled invalidation
      const tempTrip: Trip = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        nome: input.nome,
        cover_photo_url: input.cover_photo_url ?? null,
        stato: input.stato ?? 'bozza',
        data_inizio: input.data_inizio ?? null,
        data_fine: input.data_fine ?? null,
        partecipanti: input.partecipanti ?? 1,
        share_token: null,
        created_at: new Date().toISOString(),
      }
      queryClient.setQueryData<Trip[]>(TRIPS_KEY, (old) => [tempTrip, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TRIPS_KEY, context.previous)
      toast.error('Errore durante la creazione del viaggio')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TRIPS_KEY }),
  })
}

export function useUpdateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      updates,
      coverFile,
    }: {
      id: string
      updates: UpdateTripInput
      coverFile?: File | null
      oldCoverUrl?: string | null
    }) => {
      const supabase = createClient()
      let uploadedPath: string | null = null
      const payload: UpdateTripInput = { ...updates }

      if (coverFile) {
        const result = await uploadCoverFile(supabase, coverFile)
        uploadedPath = result.path
        payload.cover_photo_url = result.publicUrl
      }

      const { data, error } = await supabase
        .from('trips')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        // Cleanup newly uploaded file if DB update fails
        if (uploadedPath) await removeStorageFile(supabase, uploadedPath)
        throw error
      }

      return data as Trip
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: TRIPS_KEY })
      const previous = queryClient.getQueryData<Trip[]>(TRIPS_KEY)
      // Track old cover URL for storage cleanup on success
      const oldCoverUrl = previous?.find((t) => t.id === id)?.cover_photo_url ?? null
      queryClient.setQueryData<Trip[]>(TRIPS_KEY, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
      return { previous, oldCoverUrl }
    },
    onSuccess: async (_data, vars, context) => {
      // Delete old cover from storage when it's been replaced
      if (vars.coverFile && context?.oldCoverUrl) {
        const path = extractStoragePath(context.oldCoverUrl)
        if (path) {
          const supabase = createClient()
          await removeStorageFile(supabase, path)
        }
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TRIPS_KEY, context.previous)
      toast.error('Errore durante la modifica del viaggio')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TRIPS_KEY }),
  })
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; coverPhotoUrl?: string | null }) => {
      const supabase = createClient()
      const { error } = await supabase.from('trips').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: TRIPS_KEY })
      const previous = queryClient.getQueryData<Trip[]>(TRIPS_KEY)
      queryClient.setQueryData<Trip[]>(TRIPS_KEY, (old) =>
        (old ?? []).filter((t) => t.id !== id)
      )
      return { previous }
    },
    onSuccess: async (_data, { coverPhotoUrl }) => {
      // Cleanup cover photo from storage after successful DB delete
      if (coverPhotoUrl) {
        const path = extractStoragePath(coverPhotoUrl)
        if (path) {
          const supabase = createClient()
          await removeStorageFile(supabase, path)
        }
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TRIPS_KEY, context.previous)
      toast.error("Errore durante l'eliminazione del viaggio")
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TRIPS_KEY }),
  })
}

export function useToggleShareToken() {
  const queryClient = useQueryClient()
  return useMutation({
    // shareToken is generated by the caller: crypto.randomUUID() for ON, null for OFF
    mutationFn: async ({ id, shareToken }: { id: string; shareToken: string | null }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('trips')
        .update({ share_token: shareToken })
        .eq('id', id)
        .select('share_token')
        .single()
      if (error) throw error
      return data.share_token as string | null
    },
    onMutate: async ({ id, shareToken }) => {
      await queryClient.cancelQueries({ queryKey: TRIPS_KEY })
      const previous = queryClient.getQueryData<Trip[]>(TRIPS_KEY)
      // Optimistic: use the exact token (or null) — no sentinel strings
      queryClient.setQueryData<Trip[]>(TRIPS_KEY, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, share_token: shareToken } : t))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TRIPS_KEY, context.previous)
      toast.error('Errore durante la modifica del link')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TRIPS_KEY }),
  })
}
