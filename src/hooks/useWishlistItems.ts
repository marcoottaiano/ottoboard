'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  WishlistItem,
  WishlistItemStatus,
  CreateWishlistItemInput,
  UpdateWishlistItemInput,
} from '@/types/wishlist'

export const WISHLIST_KEY = ['wishlist-items']

// ─── Query ─────────────────────────────────────────────────────────────────────

export function useWishlistItems() {
  return useQuery<WishlistItem[]>({
    queryKey: WISHLIST_KEY,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function invalidateWishlist(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: WISHLIST_KEY })
}

export function useCreateWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateWishlistItemInput) => {
      const supabase = createClient()
      const { error } = await supabase.from('wishlist_items').insert(input)
      if (error) throw error
    },
    onSuccess: () => invalidateWishlist(queryClient),
  })
}

export function useUpdateWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWishlistItemInput }) => {
      const supabase = createClient()
      const { error } = await supabase.from('wishlist_items').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateWishlist(queryClient),
  })
}

// F7: Optimistic delete — removes item from cache immediately, restores on error
export function useDeleteWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('wishlist_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY })
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_KEY)
      queryClient.setQueryData<WishlistItem[]>(WISHLIST_KEY, (old) =>
        (old ?? []).filter((item) => item.id !== id)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous)
    },
    onSettled: () => invalidateWishlist(queryClient),
  })
}

// Bulk toggle is_public for all user's items — used by public sharing feature
// Optimistic update: immediately reflects new is_public state in cache, rolls back on error
export function useToggleWishlistPublic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (isPublic: boolean) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utente non autenticato')
      const { error } = await supabase
        .from('wishlist_items')
        .update({ is_public: isPublic })
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (isPublic) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY })
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_KEY)
      queryClient.setQueryData<WishlistItem[]>(WISHLIST_KEY, (old) =>
        (old ?? []).map((item) => ({ ...item, is_public: isPublic }))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous)
    },
    onSettled: () => invalidateWishlist(queryClient),
  })
}

// F6: newStatus typed as WishlistItemStatus (not string) — prevents invalid status writes
// Optimistic status toggle — cycles desiderato → ricevuto → acquistato → desiderato
export function useCycleWishlistStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: WishlistItemStatus }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('wishlist_items')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_KEY })
      const previous = queryClient.getQueryData<WishlistItem[]>(WISHLIST_KEY)
      queryClient.setQueryData<WishlistItem[]>(WISHLIST_KEY, (old) =>
        (old ?? []).map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(WISHLIST_KEY, context.previous)
    },
    onSettled: () => invalidateWishlist(queryClient),
  })
}
