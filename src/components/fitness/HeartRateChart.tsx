'use client'

import { useActivities } from '@/hooks/useActivities'
import { Activity } from '@/types'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function buildChartData(activities: Activity[]) {
  return activities
    .filter((a) => a.average_heartrate)
    .slice(0, 30)
    .reverse()
    .map((a) => ({
      label: new Date(a.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      fcMedia: Math.round(a.average_heartrate!),
      fcMax: a.max_heartrate ? Math.round(a.max_heartrate) : undefined,
    }))
}

export function HeartRateChart() {
  const ninetyDaysAgoStr = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

  // Solo corse
  const { data: activities, isLoading } = useActivities({
    after: ninetyDaysAgoStr,
    type: 'Run',
  })

  const chartData = activities ? buildChartData(activities) : []

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">FC Corsa (90gg)</h3>

      {isLoading ? (
        <div className="h-48 bg-white/5 rounded animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          Nessuna corsa con dati cardio
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fcMaxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fcMediaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v: number, name: string) => [
                `${v} bpm`,
                name === 'fcMedia' ? 'FC Media' : 'FC Max',
              ]}
            />
            <Area
              type="monotone"
              dataKey="fcMax"
              name="fcMax"
              stroke="#ef4444"
              strokeWidth={1}
              fill="url(#fcMaxGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="fcMedia"
              name="fcMedia"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#fcMediaGrad)"
              dot={{ r: 2, fill: '#f97316' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
