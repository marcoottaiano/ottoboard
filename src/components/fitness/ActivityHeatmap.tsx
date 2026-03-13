'use client'

import { useActivities } from '@/hooks/useActivities'
import { Activity } from '@/types'

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function getIntensity(movingTime: number | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!movingTime) return 0
  if (movingTime < 1800) return 1  // < 30min
  if (movingTime < 3600) return 2  // < 1h
  if (movingTime < 5400) return 3  // < 1.5h
  return 4
}

const INTENSITY_CLASSES = [
  'bg-white/5',
  'bg-orange-500/20',
  'bg-orange-500/40',
  'bg-orange-500/65',
  'bg-orange-500',
]

function buildGrid(activities: Activity[]) {
  const now = new Date()
  const year = now.getFullYear()
  const jan1 = new Date(year, 0, 1)

  // Mappa data ISO → attività
  const activityMap = new Map<string, Activity>()
  for (const a of activities) {
    const d = a.start_date.slice(0, 10)
    if (!activityMap.has(d)) activityMap.set(d, a)
  }

  // Primo lunedì prima o uguale al 1 gennaio
  const startDay = new Date(jan1)
  const dow = (jan1.getDay() + 6) % 7 // 0=Lun
  startDay.setDate(jan1.getDate() - dow)

  const cells: { date: string; activity?: Activity; intensity: 0 | 1 | 2 | 3 | 4 }[] = []
  const current = new Date(startDay)

  while (current.getFullYear() <= year || (current.getFullYear() === year && current <= now)) {
    const iso = current.toISOString().slice(0, 10)
    const activity = activityMap.get(iso)
    cells.push({ date: iso, activity, intensity: getIntensity(activity?.moving_time) })
    current.setDate(current.getDate() + 1)
  }

  return cells
}

function getMonthPositions(cells: { date: string }[]) {
  const positions: { label: string; col: number }[] = []
  let lastMonth = -1
  cells.forEach(({ date }, i) => {
    const m = new Date(date).getMonth()
    if (m !== lastMonth) {
      positions.push({ label: MONTHS[m], col: Math.floor(i / 7) })
      lastMonth = m
    }
  })
  return positions
}

export function ActivityHeatmap() {
  const jan1Str = `${new Date().getFullYear()}-01-01`

  const { data: activities, isLoading } = useActivities({ after: jan1Str })

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="h-28 bg-white/5 rounded" />
      </div>
    )
  }

  const cells = buildGrid(activities ?? [])
  const numWeeks = Math.ceil(cells.length / 7)
  const monthPositions = getMonthPositions(cells)

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Attività {new Date().getFullYear()}</h3>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Label mesi */}
          <div className="flex gap-1 pl-6 mb-1 relative" style={{ height: '14px' }}>
            {monthPositions.map(({ label, col }) => (
              <span
                key={`${label}-${col}`}
                className="absolute text-[10px] text-gray-500"
                style={{ left: `${col * 14 + 24}px` }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Griglia */}
          <div className="flex gap-1">
            {/* Label giorni settimana */}
            <div className="flex flex-col gap-1 mr-1">
              {DAYS.map((d, i) => (
                <span key={i} className="text-[10px] text-gray-600 h-[12px] flex items-center">
                  {i % 2 === 0 ? d : ''}
                </span>
              ))}
            </div>

            {/* Colonne settimane */}
            {Array.from({ length: numWeeks }).map((_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, dayIdx) => {
                  const cellIdx = weekIdx * 7 + dayIdx
                  const cell = cells[cellIdx]
                  if (!cell) return <div key={dayIdx} className="w-3 h-3" />

                  return (
                    <div
                      key={dayIdx}
                      title={
                        cell.activity
                          ? `${cell.date}: ${cell.activity.name}`
                          : cell.date
                      }
                      className={`w-3 h-3 rounded-[2px] ${INTENSITY_CLASSES[cell.intensity]} cursor-default`}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-1 mt-2 self-end">
            <span className="text-[10px] text-gray-600">Meno</span>
            {INTENSITY_CLASSES.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[10px] text-gray-600">Più</span>
          </div>
        </div>
      </div>
    </div>
  )
}
