'use client'

import { useActivities } from '@/hooks/useActivities'
import { Activity } from '@/types'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PERIODS = [
  { value: 30, label: '30g' },
  { value: 60, label: '60g' },
  { value: 90, label: '90g' },
  { value: 180, label: '6m' },
]

function formatPaceLabel(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function linearTrend(data: { pace: number; index: number }[]): { m: number; b: number } {
  const n = data.length
  if (n < 2) return { m: 0, b: 0 }
  const sumX = data.reduce((acc, d) => acc + d.index, 0)
  const sumY = data.reduce((acc, d) => acc + d.pace, 0)
  const sumXY = data.reduce((acc, d) => acc + d.index * d.pace, 0)
  const sumX2 = data.reduce((acc, d) => acc + d.index * d.index, 0)
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const b = (sumY - m * sumX) / n
  return { m, b }
}

function buildChartData(activities: Activity[]) {
  const runs = activities
    .filter((a) => a.type === 'Run' && a.average_pace && a.distance && a.distance > 500)
    .slice(0, 20)
    .reverse()

  const points = runs.map((a, i) => ({
    label: new Date(a.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    pace: Math.round(a.average_pace!),
    index: i,
  }))

  const { m, b } = linearTrend(points)

  return points.map((p) => ({
    ...p,
    trend: Math.round(m * p.index + b),
  }))
}

export function PaceTrendChart() {
  const [period, setPeriod] = useState(90)

  const afterStr = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10)

  const { data: activities, isLoading } = useActivities({ after: afterStr })

  const chartData = activities ? buildChartData(activities) : []

  // Calcola dominio Y adattivo con buffer di 30 secondi
  const paceValues = chartData.flatMap((d) => [d.pace, d.trend].filter(Boolean))
  const minPace = paceValues.length > 0 ? Math.min(...paceValues) - 30 : 0
  const maxPace = paceValues.length > 0 ? Math.max(...paceValues) + 30 : 600

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Pace (Corsa)</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                period === p.value
                  ? 'bg-orange-500/30 text-orange-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 bg-white/5 rounded animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          Nessuna corsa nel periodo
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <YAxis
              reversed
              domain={[minPace, maxPace]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatPaceLabel}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v, name) => [
                formatPaceLabel(Number(v)),
                name === 'pace' ? 'Pace reale' : 'Tendenza',
              ]}
            />
            <Line
              type="monotone"
              dataKey="pace"
              name="pace"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316' }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="trend"
              name="trend"
              stroke="#f9731660"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
