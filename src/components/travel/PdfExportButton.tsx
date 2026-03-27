'use client'

// CRITICAL: Loaded only via dynamic import with { ssr: false } from TripDetailHeader.
// Never import this component directly at module level.

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, ChevronDown } from 'lucide-react'
import { useTrip } from '@/hooks/useTrips'
import { useTripPlaces } from '@/hooks/useTripPlaces'
import { useTripAccommodations } from '@/hooks/useTripAccommodations'
import { useTripTransports } from '@/hooks/useTripTransports'
import { useTripItineraryItems } from '@/hooks/useTripItinerary'
// Direct import is safe: this file is only ever loaded via dynamic({ssr:false}) from TripDetailHeader
import { TripPdfDocument } from './TripPdfDocument'
import type { PdfMode } from './TripPdfDocument'

// Dynamically import react-pdf's PDFDownloadLink (browser-only)
const PDFDownloadLinkDynamic = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => null }
)

interface Props {
  tripId: string
}

export function PdfExportButton({ tripId }: Props) {
  const [mode, setMode] = useState<PdfMode>('compatto')
  const [showMenu, setShowMenu] = useState(false)

  const { data: trip } = useTrip(tripId)
  const { data: places = [] } = useTripPlaces(tripId)
  const { data: accommodations = [] } = useTripAccommodations(tripId)
  const { data: transports = [] } = useTripTransports(tripId)
  const { data: itineraryItems = [] } = useTripItineraryItems(tripId)

  if (!trip) return null

  const filename = `${trip.nome.replace(/\s+/g, '-').toLowerCase()}-${mode}.pdf`

  const document = (
    <TripPdfDocument
      trip={trip}
      places={places}
      accommodations={accommodations}
      transports={transports}
      itineraryItems={itineraryItems}
      mode={mode}
    />
  )

  return (
    <div className="relative">
      <div className="flex items-stretch rounded-lg overflow-hidden border border-blue-500/30 bg-blue-500/10">
        {/* Download button */}
        <PDFDownloadLinkDynamic
          document={document}
          fileName={filename}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 hover:bg-blue-500/20 transition-colors"
        >
          {({ loading }: { loading: boolean }) => (
            <>
              <FileDown size={13} />
              {loading ? 'Generando…' : 'Esporta PDF'}
            </>
          )}
        </PDFDownloadLinkDynamic>

        {/* Mode selector toggle */}
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="px-1.5 border-l border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
          title="Scegli formato"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Dropdown */}
      {showMenu && (
        <>
          {/* Overlay to close on outside click */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-30 rounded-lg border border-white/[0.08] bg-[#0f1117] shadow-xl min-w-[140px] py-1">
            {(['compatto', 'completo'] as PdfMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setShowMenu(false) }}
                className={[
                  'w-full text-left px-3 py-1.5 text-xs transition-colors',
                  mode === m
                    ? 'text-blue-300 bg-blue-500/10'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]',
                ].join(' ')}
              >
                {m === 'compatto' ? 'Compatto' : 'Completo'}
                <span className="block text-[10px] text-white/30 mt-0.5">
                  {m === 'compatto' ? 'Solo itinerario' : 'Itinerario + tutto'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
