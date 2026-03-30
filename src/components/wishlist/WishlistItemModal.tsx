'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateWishlistItem, useUpdateWishlistItem } from '@/hooks/useWishlistItems'
import type { WishlistItem } from '@/types/wishlist'

interface Props {
  item?: WishlistItem | null
  onClose: () => void
}

const CATEGORY_SUGGESTIONS = ['Compleanno', 'Natale', 'Generale', 'Casa', 'Tech', 'Abbigliamento']

export function WishlistItemModal({ item, onClose }: Props) {
  const createItem = useCreateWishlistItem()
  const updateItem = useUpdateWishlistItem()

  const [name, setName] = useState(item?.name ?? '')
  const [link, setLink] = useState(item?.link ?? '')
  const [price, setPrice] = useState<string>(item?.price != null ? String(item.price) : '')
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [error, setError] = useState<string | null>(null)

  const isPending = createItem.isPending || updateItem.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Il nome è obbligatorio')
      return
    }

    const parsedPrice = price !== '' ? parseFloat(price) : null
    if (price !== '' && (isNaN(parsedPrice!) || parsedPrice! < 0)) {
      setError('Il prezzo non è valido')
      return
    }

    // F8: accept any non-empty string as link (no type="url" restriction)
    // The card's isSafeUrl() will prevent unsafe URLs from being rendered as hrefs
    const payload = {
      name: name.trim(),
      link: link.trim() || null,
      price: parsedPrice,
      photo_url: photoUrl.trim() || null,
      category: category.trim() || null,
    }

    // F5: show server error in the modal instead of silently swallowing it
    const onError = (err: Error) => {
      setError(`Errore durante il salvataggio: ${err.message}`)
    }

    if (item) {
      updateItem.mutate({ id: item.id, updates: payload }, { onSuccess: onClose, onError })
    } else {
      createItem.mutate(payload, { onSuccess: onClose, onError })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">
            {item ? 'Modifica articolo' : 'Aggiungi articolo'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. AirPods Pro"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/40 transition-colors"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Categoria (opzionale)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Es. Compleanno"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/40 transition-colors mb-2"
            />
            {/* Quick-select chips */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCategory(category.trim() === suggestion ? '' : suggestion)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all duration-200 ${
                    category === suggestion
                      ? 'bg-rose-500/30 text-rose-300 border-rose-500/40'
                      : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60 hover:border-white/[0.14]'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Link — F8: type="text" to allow URLs without protocol (amazon.it/...) */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Link (opzionale)</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/40 transition-colors"
            />
          </div>

          {/* Prezzo */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Prezzo € (opzionale)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/40 transition-colors"
            />
          </div>

          {/* URL Foto */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">URL foto (opzionale)</label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/40 transition-colors"
            />
          </div>

          {/* Error — shows both client validation and server errors (F5) */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-200 disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all duration-200 disabled:opacity-50"
            >
              {isPending ? 'Salvataggio…' : item ? 'Salva' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
