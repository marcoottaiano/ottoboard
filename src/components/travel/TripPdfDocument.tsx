'use client'

// CRITICAL: This file must ONLY be imported via dynamic(..., { ssr: false }).
// Direct imports will cause Next.js build failures (browser-only library).

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Trip, TripPlace, TripAccommodation, TripTransport, TripItineraryItem } from '@/types/travel'
import { TIME_SLOTS_ORDER, SLOT_LABEL } from '@/lib/travel/constants'

export type PdfMode = 'compatto' | 'completo'

export interface TripPdfDocumentProps {
  trip: Trip
  places: TripPlace[]
  accommodations: TripAccommodation[]
  transports: TripTransport[]
  itineraryItems: TripItineraryItem[]
  mode: PdfMode
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    color: '#1a1a2e',
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  dayHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#f3f4f6',
    padding: 4,
    borderRadius: 2,
  },
  slotRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 8,
  },
  slotLabel: {
    fontSize: 8,
    color: '#6b7280',
    width: 70,
    fontFamily: 'Helvetica-Bold',
  },
  slotValue: {
    fontSize: 9,
    color: '#111827',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 9,
    color: '#374151',
    flex: 1,
  },
  rowValue: {
    fontSize: 9,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    width: 90,
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#3b82f6',
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    flex: 1,
  },
  totalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    textAlign: 'right',
    width: 90,
  },
  emptyNote: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
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

// ─── Agenda section (shared between compact and complete) ─────────────────────

function AgendaSection({
  itineraryItems,
  places,
}: {
  itineraryItems: TripItineraryItem[]
  places: TripPlace[]
}) {
  // Group items by day, then by slot
  const days = Array.from(new Set(itineraryItems.map((i) => i.day_date))).sort()

  if (days.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Itinerario</Text>
        <Text style={styles.emptyNote}>Nessun dato disponibile</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Itinerario</Text>
      {days.map((day) => {
        const dayItems = itineraryItems.filter((i) => i.day_date === day)
        return (
          <View key={day}>
            <Text style={styles.dayHeader}>{formatDate(day)}</Text>
            {TIME_SLOTS_ORDER.map((slot) => {
              const slotItems = dayItems.filter(
                (i) => i.time_slot === slot && i.item_type === 'place',
              )
              if (slotItems.length === 0) return null
              return slotItems.map((item) => {
                const place = places.find((p) => p.id === item.place_id)
                return (
                  <View key={item.id} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
                    <Text style={styles.slotValue}>{place?.nome ?? '(luogo rimosso)'}</Text>
                  </View>
                )
              })
            })}
          </View>
        )
      })}
    </View>
  )
}

// ─── Places section (complete mode only) ─────────────────────────────────────

function PlacesSection({ places }: { places: TripPlace[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Luoghi</Text>
      {places.length === 0 ? (
        <Text style={styles.emptyNote}>Nessun dato disponibile</Text>
      ) : (
        places.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.rowLabel}>{p.nome}</Text>
            <Text style={styles.rowValue}>
              {p.tipo === 'ristorante' ? 'Ristorante' : p.tipo === 'bar' ? 'Bar' : 'Attrazione'}
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

// ─── Accommodations section (complete mode only) ──────────────────────────────

function AccommodationsSection({ accommodations }: { accommodations: TripAccommodation[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Alloggi</Text>
      {accommodations.length === 0 ? (
        <Text style={styles.emptyNote}>Nessun dato disponibile</Text>
      ) : (
        accommodations.map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowLabel}>
              {a.nome}{'\n'}
              <Text style={{ fontSize: 8, color: '#6b7280' }}>
                {formatDate(a.check_in)} → {formatDate(a.check_out)}
              </Text>
            </Text>
            <Text style={styles.rowValue}>
              {a.prezzo_totale != null ? formatEur(a.prezzo_totale) : '—'}
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

// ─── Transports section (complete mode only) ──────────────────────────────────

function TransportsSection({ transports }: { transports: TripTransport[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Trasporti</Text>
      {transports.length === 0 ? (
        <Text style={styles.emptyNote}>Nessun dato disponibile</Text>
      ) : (
        transports.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.rowLabel}>
              {t.nome}{'\n'}
              <Text style={{ fontSize: 8, color: '#6b7280' }}>
                {t.categoria === 'outbound' ? 'A/R' : 'Locale'}
              </Text>
            </Text>
            <Text style={styles.rowValue}>
              {t.prezzo != null
                ? `${formatEur(t.prezzo)} ${t.prezzo_tipo === 'per_persona' ? '/pp' : 'tot'}`
                : '—'}
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

// ─── Cost estimate section (complete mode only) ───────────────────────────────

function CostSection({
  trip,
  accommodations,
  places,
  transports,
}: {
  trip: Trip
  accommodations: TripAccommodation[]
  places: TripPlace[]
  transports: TripTransport[]
}) {
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
      if (t.prezzo_tipo === 'per_persona') return sum + t.prezzo * partecipanti
      return sum + t.prezzo
    }, 0)

  const totale = alloggiCost + attrazioniCost + trasportiCost
  const quota = partecipanti > 0 ? totale / partecipanti : null

  return (
    <View>
      <Text style={styles.sectionTitle}>Stima Costi</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Alloggi</Text>
        <Text style={styles.rowValue}>{formatEur(alloggiCost)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Attrazioni</Text>
        <Text style={styles.rowValue}>{formatEur(attrazioniCost)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Trasporti</Text>
        <Text style={styles.rowValue}>{formatEur(trasportiCost)}</Text>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Totale stimato</Text>
        <Text style={styles.totalValue}>{formatEur(totale)}</Text>
      </View>
      {quota != null && (
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={[styles.rowLabel, { color: '#6b7280' }]}>Quota per persona</Text>
          <Text style={[styles.rowValue, { color: '#6b7280' }]}>{formatEur(quota)}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────

export function TripPdfDocument({
  trip,
  places,
  accommodations,
  transports,
  itineraryItems,
  mode,
}: TripPdfDocumentProps) {
  const dateRange =
    trip.data_inizio && trip.data_fine
      ? `${formatDate(trip.data_inizio)} → ${formatDate(trip.data_fine)}`
      : trip.data_inizio
      ? `Dal ${formatDate(trip.data_inizio)}`
      : 'Date non impostate'

  return (
    <Document title={trip.nome} author="Ottoboard">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{trip.nome}</Text>
          <Text style={styles.subtitle}>
            {dateRange} · {trip.partecipanti}{' '}
            {trip.partecipanti === 1 ? 'partecipante' : 'partecipanti'}
          </Text>
        </View>

        {/* Always: itinerary */}
        <AgendaSection itineraryItems={itineraryItems} places={places} />

        {/* Complete mode: extra sections */}
        {mode === 'completo' && (
          <>
            <PlacesSection places={places} />
            <AccommodationsSection accommodations={accommodations} />
            <TransportsSection transports={transports} />
            <CostSection
              trip={trip}
              accommodations={accommodations}
              places={places}
              transports={transports}
            />
          </>
        )}

        {/* Footer */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) =>
          `Generato da Ottoboard · Pag. ${pageNumber} / ${totalPages}`
        } fixed />
      </Page>
    </Document>
  )
}
