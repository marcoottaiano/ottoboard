'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useActivities } from '@/hooks/useActivities'
import { Activity } from '@/types'
import { toLocalDateStr } from '@/lib/dateUtils'

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function getIntensity(movingTime: number | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!movingTime) return 0
  if (movingTime < 1800) return 1  // < 30 min
  if (movingTime < 3600) return 2  // < 1 h
  if (movingTime < 5400) return 3  // < 1.5 h
  return 4
}

const INTENSITY_CLASSES = [
  'bg-white/5',
  'bg-orange-500/20',
  'bg-orange-500/40',
  'bg-orange-500/65',
  'bg-orange-500',
]

// "Lun 15 Gen 2025" per il tooltip
function formatCellDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const dow = new Date(y, m - 1, d).getDay()
  return `${dayNames[dow]} ${d} ${MONTHS[m - 1]} ${y}`
}

function buildGrid(activities: Activity[], year: number) {
  const jan1 = new Date(year, 0, 1)
  const today = toLocalDateStr(new Date())

  // Mappa solo le attività di quell'anno (doppio filtro: query + qui)
  // Usa toLocalDateStr per evitare sfasamenti UTC: una run alle 23:30 CET
  // sarebbe il giorno precedente in UTC, spostandola sulla cella sbagliata.
  const activityMap = new Map<string, Activity>()
  for (const a of activities) {
    const d = toLocalDateStr(new Date(a.start_date))
    if (!d.startsWith(`${year}-`)) continue
    if (!activityMap.has(d)) activityMap.set(d, a)
  }

  // Primo lunedì prima o uguale al 1 gennaio
  const startDay = new Date(jan1)
  const dow = (jan1.getDay() + 6) % 7 // 0 = Lunedì
  startDay.setDate(jan1.getDate() - dow)

  // Mostra sempre l'intero anno; le celle future sono semi-trasparenti
  const displayEnd = new Date(year, 11, 31)

  const cells: {
    date: string
    activity?: Activity
    intensity: 0 | 1 | 2 | 3 | 4
    isFuture: boolean
  }[] = []

  const current = new Date(startDay)
  while (current <= displayEnd) {
    const iso = toLocalDateStr(current)
    const activity = activityMap.get(iso)
    cells.push({
      date: iso,
      activity,
      intensity: getIntensity(activity?.moving_time),
      isFuture: iso > today,
    })
    current.setDate(current.getDate() + 1)
  }

  return cells
}

// Quale colonna (settimana) inizia ogni mese? Considera solo l'anno richiesto.
function getMonthStartCols(cells: { date: string }[], year: number): Map<number, string> {
  const map = new Map<number, string>() // col → label mese
  let lastMonth = -1
  cells.forEach(({ date }, i) => {
    const [y, m] = date.split('-').map(Number)
    if (y !== year) return
    const month = m - 1
    if (month !== lastMonth) {
      map.set(Math.floor(i / 7), MONTHS[month])
      lastMonth = month
    }
  })
  return map
}

interface TooltipState {
  label: string
  name?: string
  x: number
  y: number
}

export function ActivityHeatmap() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Filtra strettamente per anno — evita che attività di altri anni inquinino la mappa
  const { data: activities, isLoading } = useActivities({
    after: `${year}-01-01`,
    before: `${year}-12-31T23:59:59`,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="h-28 bg-white/5 rounded" />
      </div>
    )
  }

  const cells = buildGrid(activities ?? [], year)
  const numWeeks = Math.ceil(cells.length / 7)
  const monthStartCols = getMonthStartCols(cells, year)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 overflow-hidden">
      {/* Header: titolo + legenda + navigazione anno */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Attività {year}</h3>
        <div className="flex items-center gap-3">
          {/* Legenda intensità */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600">Meno</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[10px] text-gray-600">Più</span>
          </div>
          {/* Anno precedente / successivo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
              title="Anno precedente"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Anno successivo"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/*
        overflow-y-hidden è necessario: impostare overflow-x: auto su un elemento
        forza implicitamente overflow-y: auto (spec CSS), generando uno scroll verticale
        indesiderato. Con overflow-y-hidden lo blocchiamo esplicitamente.
      */}
      <div className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
        <div className="inline-flex gap-1 min-w-max">

          {/* Colonna etichette giorni (L M M G V S D) con spacer per la riga mesi */}
          <div className="flex flex-col gap-1">
            {/* Riga mesi: spacer vuoto, allineato in altezza con le label mesi nelle colonne */}
            <div className="h-[14px]" />
            {DAYS.map((d, i) => (
              <span key={i} className="text-[10px] text-gray-600 h-3 flex items-center pr-1">
                {i % 2 === 0 ? d : ''}
              </span>
            ))}
          </div>

          {/* Colonne settimane — ogni colonna porta la sua etichetta mese se è la prima di quel mese */}
          {Array.from({ length: numWeeks }).map((_, weekIdx) => {
            const monthLabel = monthStartCols.get(weekIdx)
            return (
              <div key={weekIdx} className="flex flex-col gap-1">
                {/* Etichetta mese (o spazio vuoto) — sempre presente per mantenere l'allineamento */}
                <div className="h-[14px] flex items-end pb-0.5">
                  {monthLabel && (
                    <span className="text-[10px] text-gray-500 leading-none whitespace-nowrap">
                      {monthLabel}
                    </span>
                  )}
                </div>

                {/* 7 celle giorni */}
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cellIdx = weekIdx * 7 + dayIdx
                  const cell = cells[cellIdx]
                  if (!cell) return <div key={dayIdx} className="w-3 h-3" />

                  return (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-[2px] cursor-default ${
                        INTENSITY_CLASSES[cell.intensity]
                      } ${cell.isFuture ? 'opacity-25' : ''}`}
                      onMouseEnter={(e) =>
                        setTooltip({
                          label: formatCellDate(cell.date),
                          name: cell.activity?.name,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null))
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tooltip floating */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-xs shadow-xl whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 38 }}
        >
          <span className="font-medium text-white">{tooltip.label}</span>
          {tooltip.name && <span className="text-gray-400"> · {tooltip.name}</span>}
        </div>
      )}
    </div>
  )
}
