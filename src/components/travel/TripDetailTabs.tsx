'use client'

export type TripTab = 'luoghi' | 'alloggi' | 'trasporti' | 'itinerario' | 'stima-costi'

const TABS: { id: TripTab; label: string }[] = [
  { id: 'luoghi', label: 'Luoghi' },
  { id: 'alloggi', label: 'Alloggi' },
  { id: 'trasporti', label: 'Trasporti' },
  { id: 'itinerario', label: 'Itinerario' },
  { id: 'stima-costi', label: 'Stima Costi' },
]

interface Props {
  active: TripTab
  onChange: (tab: TripTab) => void
}

export function TripDetailTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-6 overflow-x-auto" style={{ overflowY: 'hidden' }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0',
            active === id
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
