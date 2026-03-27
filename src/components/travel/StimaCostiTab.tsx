'use client'

import { Hotel, MapPin, Plane } from 'lucide-react'
import { useTripCostEstimate } from '@/hooks/useTripCostEstimate'
import type { AlloggioRow, AttrazioneRow, TrasportoRow } from '@/hooks/useTripCostEstimate'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEur(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const DASH = '—'

// ─── Row components ───────────────────────────────────────────────────────────

function ItemRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-white/60 truncate mr-3">{label}</span>
      <span className="text-xs text-white/80 shrink-0">{value}</span>
    </div>
  )
}

function SubtotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between pt-2 mt-1">
      <span className="text-xs font-semibold text-white/70">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode
  title: string
  isEmpty: boolean
  subtotal: string
  children: React.ReactNode
}

function Section({ icon, title, isEmpty, subtotal, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white/40">{icon}</span>
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">{title}</h3>
      </div>

      {isEmpty ? (
        <p className="text-xs text-white/20 italic py-1">Nessun dato disponibile</p>
      ) : (
        <>
          <div>{children}</div>
          <SubtotalRow label="Subtotale" value={subtotal} />
        </>
      )}
    </div>
  )
}

// ─── Alloggi section ─────────────────────────────────────────────────────────

function AlloggiSection({ rows, total }: { rows: AlloggioRow[]; total: number | null }) {
  return (
    <Section
      icon={<Hotel size={14} />}
      title="Alloggi"
      isEmpty={rows.length === 0}
      subtotal={total != null ? formatEur(total) : DASH}
    >
      {rows.map((r) => (
        <ItemRow
          key={r.id}
          label={r.nome}
          value={r.cost != null ? formatEur(r.cost) : DASH}
        />
      ))}
    </Section>
  )
}

// ─── Attrazioni section ──────────────────────────────────────────────────────

function AttrazioniSection({ rows, total }: { rows: AttrazioneRow[]; total: number | null }) {
  return (
    <Section
      icon={<MapPin size={14} />}
      title="Attrazioni"
      isEmpty={rows.length === 0}
      subtotal={total != null ? formatEur(total) : DASH}
    >
      {rows.map((r) => (
        <ItemRow
          key={r.id}
          label={r.nome}
          value={r.cost != null ? formatEur(r.cost) : DASH}
        />
      ))}
    </Section>
  )
}

// ─── Trasporti section ───────────────────────────────────────────────────────

function TrasportiSection({ rows, total }: { rows: TrasportoRow[]; total: number | null }) {
  return (
    <Section
      icon={<Plane size={14} />}
      title="Trasporti"
      isEmpty={rows.length === 0}
      subtotal={total != null ? formatEur(total) : DASH}
    >
      {rows.map((r) => (
        <ItemRow
          key={r.id}
          label={r.nome}
          value={r.cost != null ? formatEur(r.cost) : DASH}
        />
      ))}
    </Section>
  )
}

// ─── Summary footer ───────────────────────────────────────────────────────────

function SummaryFooter({
  totale,
  quota,
}: {
  totale: number | null
  quota: number | null
}) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white/80">Totale stimato</span>
        <span className="text-sm font-bold text-white">
          {totale != null ? formatEur(totale) : DASH}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">Quota per persona</span>
        <span className="text-xs text-white/70">
          {quota != null ? formatEur(quota) : DASH}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  tripId: string
}

export function StimaCostiTab({ tripId }: Props) {
  const {
    alloggi,
    alloggiTotal,
    attrazioni,
    attrazioniTotal,
    trasporti,
    trasportiTotal,
    totaleStimato,
    quotaPerPersona,
    isLoading,
  } = useTripCostEstimate(tripId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AlloggiSection rows={alloggi} total={alloggiTotal} />
      <AttrazioniSection rows={attrazioni} total={attrazioniTotal} />
      <TrasportiSection rows={trasporti} total={trasportiTotal} />
      <SummaryFooter totale={totaleStimato} quota={quotaPerPersona} />
    </div>
  )
}
