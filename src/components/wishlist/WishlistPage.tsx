'use client'

import { useState } from 'react'
import { Gift, Plus } from 'lucide-react'
import { useWishlistItems } from '@/hooks/useWishlistItems'
import { WishlistItemCard } from './WishlistItemCard'
import { WishlistItemModal } from './WishlistItemModal'
import type { WishlistItem } from '@/types/wishlist'

export function WishlistPage() {
  const { data: items = [], isLoading, isError } = useWishlistItems()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)

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
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all duration-200"
        >
          <Plus size={14} />
          Aggiungi
        </button>
      </div>

      {/* F4: error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-red-400 mb-1">Impossibile caricare la wishlist</p>
          <p className="text-xs text-white/30">Controlla la connessione e riprova</p>
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
      ) : !isError ? (
        <div className="space-y-2">
          {items.map((item) => (
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
