'use client'

import { useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useCycleWishlistStatus, useDeleteWishlistItem } from '@/hooks/useWishlistItems'
import { nextStatus, STATUS_LABELS } from '@/types/wishlist'
import type { WishlistItem, WishlistItemStatus } from '@/types/wishlist'

interface Props {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
}

// F9: typed as Record<WishlistItemStatus, string> for exhaustiveness
const STATUS_COLORS: Record<WishlistItemStatus, string> = {
  desiderato: 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30',
  ricevuto:   'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
  acquistato: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30',
}

// F1: only allow http/https links to prevent javascript: URI XSS
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function WishlistItemCard({ item, onEdit }: Props) {
  const cycleStatus = useCycleWishlistStatus()
  // F3: pass setConfirmDelete to reset it on delete error
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteItem = useDeleteWishlistItem()

  const handleStatusClick = () => {
    cycleStatus.mutate({ id: item.id, newStatus: nextStatus(item.status) })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    // F3: reset confirmDelete on error so user can try again or cancel
    deleteItem.mutate(item.id, {
      onError: () => setConfirmDelete(false),
    })
  }

  const safeLink = item.link && isSafeUrl(item.link) ? item.link : null

  return (
    <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.10] transition-all duration-200 group">
      {/* Photo thumbnail */}
      {item.photo_url ? (
        <img
          src={item.photo_url}
          alt={item.name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.06] flex-shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="block w-full text-left"
        >
          <span className="text-sm font-medium text-white/80 truncate block hover:text-white transition-colors">
            {item.name}
          </span>
        </button>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Status badge — F10: aria-label describes current state and next action */}
          <button
            type="button"
            onClick={handleStatusClick}
            disabled={cycleStatus.isPending}
            aria-label={`Stato: ${STATUS_LABELS[item.status]}. Clicca per cambiare`}
            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 disabled:opacity-50 ${STATUS_COLORS[item.status]}`}
          >
            {STATUS_LABELS[item.status]}
          </button>

          {/* Price */}
          {item.price != null && (
            <span className="text-xs text-white/40">
              €{item.price.toFixed(2)}
            </span>
          )}

          {/* F1: only render link if URL is safe (http/https) */}
          {safeLink && (
            <a
              href={safeLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white/30 hover:text-rose-400 transition-colors"
              aria-label="Apri link articolo"
              title="Apri link"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* F2: delete always visible on mobile, hover-only on desktop */}
      <div className="flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              aria-label="Conferma eliminazione"
              className="px-2 py-1 rounded-lg text-xs text-red-300 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
            >
              Conferma
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              aria-label="Annulla eliminazione"
              className="px-2 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            aria-label={`Elimina ${item.name}`}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Elimina"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
