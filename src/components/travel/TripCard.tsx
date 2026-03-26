'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Pencil, Trash2, Users, Calendar, Link2, Copy, Check } from 'lucide-react'
import { useDeleteTrip, useToggleShareToken } from '@/hooks/useTrips'
import type { Trip, TripStatus } from '@/types/travel'

const STATUS_LABELS: Record<TripStatus, string> = {
  bozza: 'Bozza',
  pianificato: 'Pianificato',
  in_corso: 'In corso',
  completato: 'Completato',
}

const STATUS_COLORS: Record<TripStatus, string> = {
  bozza: 'text-white/40 bg-white/[0.06] border-white/[0.08]',
  pianificato: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  in_corso: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  completato: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

const COVER_GRADIENTS = [
  'from-blue-600/40 to-indigo-800/40',
  'from-purple-600/40 to-pink-800/40',
  'from-emerald-600/40 to-teal-800/40',
  'from-amber-600/40 to-orange-800/40',
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '—'
  const date = new Date(y, m - 1, d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  trip: Trip
  onEdit: () => void
}

export function TripCard({ trip, onEdit }: Props) {
  const deleteTrip = useDeleteTrip()
  const toggleShare = useToggleShareToken()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const gradientIndex =
    trip.id
      .split('')
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % COVER_GRADIENTS.length
  const gradient = COVER_GRADIENTS[gradientIndex]

  // Auto-reset confirm after 3s — works on both mouse and touch
  useEffect(() => {
    if (!confirmDelete) return
    const timer = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  const shareUrl = trip.share_token
    ? `${window.location.origin}/shared/${trip.share_token}`
    : null

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteTrip.mutate(
      { id: trip.id, coverPhotoUrl: trip.cover_photo_url },
      { onError: () => setConfirmDelete(false) }
    )
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleShare = () => {
    // Generate token here so onMutate can use the same value — no sentinel strings
    const newToken = trip.share_token ? null : crypto.randomUUID()
    toggleShare.mutate({ id: trip.id, shareToken: newToken })
  }

  return (
    <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden hover:border-white/[0.10] transition-all duration-200 group">
      {/* Cover photo / gradient */}
      <Link href={`/travel/${trip.id}`} className="block">
        <div className="relative h-32 overflow-hidden">
          {trip.cover_photo_url ? (
            <Image
              src={trip.cover_photo_url}
              alt={trip.nome}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
          )}
          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[trip.stato]}`}
            >
              {STATUS_LABELS[trip.stato]}
            </span>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="px-4 py-3">
        <Link href={`/travel/${trip.id}`} className="block mb-2">
          <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
            {trip.nome}
          </h3>
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-white/35 mb-3">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {trip.data_inizio ? (
              <>
                {formatDate(trip.data_inizio)}
                {trip.data_fine && trip.data_fine !== trip.data_inizio && (
                  <> → {formatDate(trip.data_fine)}</>
                )}
              </>
            ) : (
              'Date non impostate'
            )}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {trip.partecipanti}
          </span>
        </div>

        {/* Share row */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleToggleShare}
            disabled={toggleShare.isPending}
            className={[
              'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all duration-200 disabled:opacity-50',
              trip.share_token
                ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                : 'text-white/30 bg-transparent border-white/[0.06] hover:text-white/60 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <Link2 size={11} />
            {trip.share_token ? 'Link attivo' : 'Condividi'}
          </button>

          {shareUrl && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
              title="Copia link"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copiato' : 'Copia'}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.06] px-2 py-1 rounded-lg transition-all duration-200"
          >
            <Pencil size={11} />
            Modifica
          </button>

          {confirmDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleteTrip.isPending}
              className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-all duration-200"
            >
              Conferma eliminazione
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all duration-200"
            >
              <Trash2 size={11} />
              Elimina
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
