'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Users, Plane } from 'lucide-react'
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '—'
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface Props {
  trip: Trip
}

export function TripDetailHeader({ trip }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/travel"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Plane size={15} className="text-blue-400" />
        </div>
        <h1 className="text-lg font-semibold text-white truncate">{trip.nome}</h1>
        <span
          className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[trip.stato]}`}
        >
          {STATUS_LABELS[trip.stato]}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-white/40 pl-1">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} />
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
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          {trip.partecipanti} {trip.partecipanti === 1 ? 'partecipante' : 'partecipanti'}
        </span>
      </div>
    </div>
  )
}
