// Public shared trip page — server component, no auth required.
// Uses the Supabase anon client (RLS: share_token IS NOT NULL allows public SELECT).

import { notFound } from 'next/navigation'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { Calendar, Users, MapPin, Hotel, Plane, ExternalLink } from 'lucide-react'
import { TIME_SLOTS_ORDER, SLOT_LABEL } from '@/lib/travel/constants'
import type {
  Trip,
  TripStatus,
  TripPlace,
  TripAccommodation,
  TripTransport,
  TripItineraryItem,
} from '@/types/travel'

// ─── Constants ────────────────────────────────────────────────────────────────

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

const TIPO_LABELS: Record<string, string> = {
  ristorante: 'Ristorante',
  bar: 'Bar',
  attrazione: 'Attrazione',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// ─── Cost computation (replicated from useTripCostEstimate — no hooks in server) ──

function computeCostEstimate(
  trip: Trip,
  accommodations: TripAccommodation[],
  places: TripPlace[],
  transports: TripTransport[],
) {
  const partecipanti = trip.partecipanti > 0 ? trip.partecipanti : 1

  const alloggiCost = accommodations
    .filter((a) => a.includi_in_stima && a.prezzo_totale != null)
    .reduce((sum, a) => sum + (a.prezzo_totale ?? 0), 0)

  const attrazioniCost = places
    .filter((p) => p.tipo === 'attrazione' && p.prezzo_per_persona != null)
    .reduce((sum, p) => sum + (p.prezzo_per_persona ?? 0) * partecipanti, 0)

  const trasportiCost = transports
    .filter((t) => t.prezzo != null)
    .reduce((sum, t) => {
      if (t.prezzo == null) return sum
      return t.prezzo_tipo === 'per_persona'
        ? sum + t.prezzo * partecipanti
        : sum + t.prezzo
    }, 0)

  const totale = alloggiCost + attrazioniCost + trasportiCost
  const quota = partecipanti > 0 ? totale / partecipanti : null
  return { alloggiCost, attrazioniCost, trasportiCost, totale, quota }
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-white/40">{icon}</span>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EmptyNote() {
  return <p className="text-sm text-white/30 italic">Nessun dato disponibile</p>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { token: string }
}

export default async function SharedTripPage({ params }: PageProps) {
  // Use anonymous client (no cookies) — public page, no auth session required
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Fetch trip by share_token — RLS allows this if share_token IS NOT NULL
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', params.token)
    .single()

  if (tripError || !tripData) {
    notFound()
  }

  const trip = tripData as Trip

  // Fetch all related data in parallel
  const [placesRes, accommodationsRes, transportsRes, itineraryRes] = await Promise.all([
    supabase.from('trip_places').select('*').eq('trip_id', trip.id).order('created_at', { ascending: true }),
    supabase.from('trip_accommodations').select('*').eq('trip_id', trip.id).order('created_at', { ascending: true }),
    supabase.from('trip_transports').select('*').eq('trip_id', trip.id).order('created_at', { ascending: true }),
    supabase.from('trip_itinerary_items').select('*').eq('trip_id', trip.id).order('position', { ascending: true }),
  ])

  const places = (placesRes.data ?? []) as TripPlace[]
  const accommodations = (accommodationsRes.data ?? []) as TripAccommodation[]
  const transports = (transportsRes.data ?? []) as TripTransport[]
  const itineraryItems = (itineraryRes.data ?? []) as TripItineraryItem[]
  const placeMap = new Map(places.map((p) => [p.id, p]))

  const cost = computeCostEstimate(trip, accommodations, places, transports)

  // Group itinerary by day
  const itineraryDays = Array.from(new Set(itineraryItems.map((i) => i.day_date))).sort()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">

      {/* Trip header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{trip.nome}</h1>
            <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[trip.stato]}`}>
              {STATUS_LABELS[trip.stato]}
            </span>
          </div>
          {trip.cover_photo_url && (
            <Image
              src={trip.cover_photo_url}
              alt={trip.nome}
              width={80}
              height={80}
              className="rounded-xl object-cover shrink-0"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            {trip.data_inizio
              ? `${formatDate(trip.data_inizio)}${trip.data_fine && trip.data_fine !== trip.data_inizio ? ` → ${formatDate(trip.data_fine)}` : ''}`
              : 'Date non impostate'}
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {trip.partecipanti} {trip.partecipanti === 1 ? 'partecipante' : 'partecipanti'}
          </span>
        </div>
      </div>

      {/* Places */}
      <Section icon={<MapPin size={15} />} title="Luoghi">
        {places.length === 0 ? (
          <EmptyNote />
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {places.map((place) => (
              <div key={place.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <span className="text-sm text-white/80">{place.nome}</span>
                  <span className="ml-2 text-[11px] text-white/30">{TIPO_LABELS[place.tipo] ?? place.tipo}</span>
                </div>
                {place.maps_url?.startsWith('https://') && (
                  <a
                    href={place.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Maps <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Accommodations */}
      <Section icon={<Hotel size={15} />} title="Alloggi">
        {accommodations.length === 0 ? (
          <EmptyNote />
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {accommodations.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm text-white/80">{acc.nome}</p>
                  <p className="text-xs text-white/40">
                    {formatDate(acc.check_in)} → {formatDate(acc.check_out)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {acc.maps_url?.startsWith('https://') && (
                    <a
                      href={acc.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Maps <ExternalLink size={10} />
                    </a>
                  )}
                  <span className="text-sm text-white/70">
                    {acc.prezzo_totale != null ? formatEur(acc.prezzo_totale) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Transports */}
      <Section icon={<Plane size={15} />} title="Trasporti">
        {transports.length === 0 ? (
          <EmptyNote />
        ) : (
          <>
            {(['outbound', 'locale'] as const).map((cat) => {
              const catTransports = transports.filter((t) => t.categoria === cat)
              if (catTransports.length === 0) return null
              return (
                <div key={cat} className="mb-4 last:mb-0">
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wide mb-2">
                    {cat === 'outbound' ? 'Andata / Ritorno' : 'Locale'}
                  </p>
                  <div className="flex flex-col divide-y divide-white/[0.04]">
                    {catTransports.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                        <span className="text-sm text-white/80">{t.nome}</span>
                        <span className="text-sm text-white/60">
                          {t.prezzo != null
                            ? `${formatEur(t.prezzo)} ${t.prezzo_tipo === 'per_persona' ? '/pp' : 'tot'}`
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </Section>

      {/* Itinerary */}
      <Section icon={<Calendar size={15} />} title="Itinerario">
        {itineraryDays.length === 0 ? (
          <EmptyNote />
        ) : (
          <div className="flex flex-col gap-5">
            {itineraryDays.map((day) => {
              const dayItems = itineraryItems.filter((i) => i.day_date === day)
              return (
                <div key={day}>
                  <p className="text-xs font-semibold text-white/50 mb-2">{formatDate(day)}</p>
                  <div className="flex flex-col gap-1">
                    {TIME_SLOTS_ORDER.map((slot) => {
                      const slotItems = dayItems.filter(
                        (i) => i.time_slot === slot && i.item_type === 'place',
                      )
                      if (slotItems.length === 0) return null
                      return slotItems.map((item) => {
                        const place = item.place_id ? placeMap.get(item.place_id) : undefined
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="w-24 text-[11px] text-white/30 shrink-0">{SLOT_LABEL[slot]}</span>
                            <span className="text-sm text-white/80">{place?.nome ?? '—'}</span>
                          </div>
                        )
                      })
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Cost estimate */}
      <Section icon={<span className="text-sm">€</span>} title="Stima Costi">
        {cost.totale === 0 ? (
          <EmptyNote />
        ) : (
          <div className="flex flex-col gap-2">
            {[
              { label: 'Alloggi', value: cost.alloggiCost },
              { label: 'Attrazioni', value: cost.attrazioniCost },
              { label: 'Trasporti', value: cost.trasportiCost },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-white/50">{label}</span>
                <span className="text-white/70">{formatEur(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm font-semibold border-t border-white/[0.08] pt-2 mt-1">
              <span className="text-white/80">Totale stimato</span>
              <span className="text-white">{formatEur(cost.totale)}</span>
            </div>
            {cost.quota != null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Quota per persona</span>
                <span className="text-white/60">{formatEur(cost.quota)}</span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Footer */}
      <p className="text-center text-xs text-white/20 pb-4">
        Condiviso con Ottoboard
      </p>
    </div>
  )
}
