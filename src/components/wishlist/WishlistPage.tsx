'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Gift, Plus, Share2, Lock, Copy, Check } from 'lucide-react'
import { useWishlistItems, useToggleWishlistPublic } from '@/hooks/useWishlistItems'
import { WishlistItemCard } from './WishlistItemCard'
import { WishlistItemModal } from './WishlistItemModal'
import type { WishlistItem } from '@/types/wishlist'
import { prioritySortValue } from '@/types/wishlist'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function WishlistPage() {
  const { data: items = [], isLoading, isError } = useWishlistItems()
  const togglePublic = useToggleWishlistPublic()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // F6: store timer ref for cleanup on unmount
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // F4: use getSession() — reads from local cache, no network round-trip needed for URL construction
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
    // F6: cleanup timer on unmount
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingItem(null)
  }

  // Derive distinct categories from items (client-side, no refetch)
  const categories = useMemo(
    () => Array.from(new Set(items.filter((i) => i.category).map((i) => i.category as string))).sort(),
    [items],
  )

  // F2: reset selectedCategory when the active category no longer exists in the list
  useEffect(() => {
    if (selectedCategory !== null && !categories.includes(selectedCategory)) {
      setSelectedCategory(null)
    }
  }, [categories, selectedCategory])

  // Client-side filter + sort by priority (alta first, null last)
  const filteredItems = useMemo(() => {
    const filtered = selectedCategory === null ? items : items.filter((i) => i.category === selectedCategory)
    return [...filtered].sort((a, b) => prioritySortValue(a.priority) - prioritySortValue(b.priority))
  }, [items, selectedCategory])

  // F1: isPublic = true when at least one item is public (not requiring ALL to be public)
  // This prevents the URL bar from disappearing when a new item with is_public=false is added
  const isPublic = items.length > 0 && items.some((i) => i.is_public)

  const publicUrl = userId
    ? `${window.location.origin}/wishlist/${userId}/public`
    : null

  const handleShareToggle = () => {
    if (isPublic) {
      // Revoke public sharing
      togglePublic.mutate(false, {
        onSuccess: () => toast.success('Wishlist resa privata'),
        onError: () => toast.error('Errore durante la modifica della visibilità'),
      })
    } else {
      // Enable public sharing
      togglePublic.mutate(true, {
        onSuccess: () => toast.success('Wishlist condivisa pubblicamente'),
        onError: () => toast.error('Errore durante la condivisione'),
      })
    }
  }

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast.success('Link copiato negli appunti')
      // F6: store timer in ref so it can be cleared on unmount
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossibile copiare il link')
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <Gift size={16} className="text-rose-400" />
          </div>
          <h1 className="text-lg font-semibold text-white/90">Wishlist</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Share toggle button */}
          {items.length > 0 && (
            <button
              onClick={handleShareToggle}
              disabled={togglePublic.isPending}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 disabled:opacity-50 whitespace-nowrap ${
                isPublic
                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30'
                  : 'bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06] border-white/[0.08]'
              }`}
              aria-label={isPublic ? 'Rendi wishlist privata' : 'Condividi wishlist pubblicamente'}
            >
              {isPublic ? <Lock size={11} /> : <Share2 size={11} />}
              {isPublic ? 'Rendi privata' : 'Condividi'}
            </button>
          )}

          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all duration-200"
          >
            <Plus size={13} />
            Aggiungi
          </button>
        </div>
      </div>

      {/* Public share URL bar */}
      {isPublic && publicUrl && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl">
          <p className="flex-1 text-xs text-emerald-300/70 truncate font-mono">{publicUrl}</p>
          <button
            onClick={handleCopy}
            aria-label="Copia link pubblico"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/20 transition-colors shrink-0"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiato' : 'Copia'}
          </button>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-red-400 mb-1">Impossibile caricare la wishlist</p>
          <p className="text-xs text-white/30">Controlla la connessione e riprova</p>
        </div>
      )}

      {/* Category filter chips */}
      {!isError && !isLoading && categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1" style={{ overflowY: 'hidden' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
              selectedCategory === null
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'
            }`}
          >
            Tutti
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!isError && isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      ) : !isError && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
            <Gift size={28} className="text-rose-400/60" />
          </div>
          <p className="text-sm font-medium text-white/40 mb-1">Nessun articolo nella wishlist</p>
          <p className="text-xs text-white/25 mb-5">Aggiungi articoli che vuoi acquistare o ricevere come regalo</p>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all duration-200"
          >
            <Plus size={14} />
            Aggiungi il primo articolo
          </button>
        </div>
      ) : !isError && filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/30">Nessun articolo nella categoria selezionata</p>
        </div>
      ) : !isError ? (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <WishlistItemCard key={item.id} item={item} onEdit={handleEdit} />
          ))}
        </div>
      ) : null}

      {/* Modal */}
      {modalOpen && (
        <WishlistItemModal item={editingItem} onClose={handleClose} />
      )}
    </div>
  )
}
