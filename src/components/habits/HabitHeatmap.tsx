'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHabitCompletions } from '@/hooks/useHabits'
import { toLocalDateStr } from '@/lib/dateUtils'

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

const INTENSITY_CLASSES = [
  'bg-white/5',
  'bg-teal-500/20',
  'bg-teal-500/40',
  'bg-teal-500/65',
  'bg-teal-500',
]

function getIntensity(count: number | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!count) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function formatCellDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const dow = new Date(y, m - 1, d).getDay()
  return `${dayNames[dow]} ${d} ${MONTHS[m - 1]} ${y}`
}

function buildGrid(countByDate: Record<string, number>, year: number) {
  const jan1 = new Date(year, 0, 1)
  const today = toLocalDateStr(new Date())
  const dow = (jan1.getDay() + 6) % 7
  const startDay = new Date(jan1)
  startDay.setDate(jan1.getDate() - dow)

  const displayEnd = new Date(year, 11, 31)
  const cells: { date: string; count: number; intensity: 0 | 1 | 2 | 3 | 4; isFuture: boolean }[] = []

  const current = new Date(startDay)
  while (current <= displayEnd) {
    const iso = toLocalDateStr(current)
    const count = countByDate[iso] ?? 0
    cells.push({
      date: iso,
      count,
      intensity: getIntensity(count),
      isFuture: iso > today,
    })
    current.setDate(current.getDate() + 1)
  }
  return cells
}

function getMonthStartCols(cells: { date: string }[], year: number): Map<number, string> {
  const map = new Map<number, string>()
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
  count: number
  x: number
  y: number
}

export function HabitHeatmap() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { data: countByDate = {}, isLoading } = useHabitCompletions(year)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="h-28 bg-white/5 rounded" />
      </div>
    )
  }

  const cells = buildGrid(countByDate, year)
  const numWeeks = Math.ceil(cells.length / 7)
  const monthStartCols = getMonthStartCols(cells, year)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Abitudini {year}</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600">Meno</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[10px] text-gray-600">Più</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
        <div className="inline-flex gap-1 min-w-max">
          <div className="flex flex-col gap-1">
            <div className="h-[14px]" />
            {DAYS.map((d, i) => (
              <span key={i} className="text-[10px] text-gray-600 h-3 flex items-center pr-1">
                {i % 2 === 0 ? d : ''}
              </span>
            ))}
          </div>

          {Array.from({ length: numWeeks }).map((_, weekIdx) => {
            const monthLabel = monthStartCols.get(weekIdx)
            return (
              <div key={weekIdx} className="flex flex-col gap-1">
                <div className="h-[14px] flex items-end pb-0.5">
                  {monthLabel && (
                    <span className="text-[10px] text-gray-500 leading-none whitespace-nowrap">
                      {monthLabel}
                    </span>
                  )}
                </div>
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cell = cells[weekIdx * 7 + dayIdx]
                  if (!cell) return <div key={dayIdx} className="w-3 h-3" />
                  return (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-[2px] cursor-default ${INTENSITY_CLASSES[cell.intensity]} ${cell.isFuture ? 'opacity-25' : ''}`}
                      onMouseEnter={(e) =>
                        setTooltip({ label: formatCellDate(cell.date), count: cell.count, x: e.clientX, y: e.clientY })
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

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-xs shadow-xl whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 38 }}
        >
          <span className="font-medium text-white">{tooltip.label}</span>
          {tooltip.count > 0 && (
            <span className="text-gray-400"> · {tooltip.count} abitudin{tooltip.count === 1 ? 'e' : 'i'}</span>
          )}
        </div>
      )}
    </div>
  )
}
