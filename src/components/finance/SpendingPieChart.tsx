'use client'

import { useTransactions } from '@/hooks/useTransactions'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PrivacyValue } from '@/components/ui/PrivacyValue'
import { usePrivacyMode } from '@/hooks/usePrivacyMode'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

interface Props {
  month: string
}

export function SpendingPieChart({ month }: Props) {
  const { data: transactions, isLoading } = useTransactions({ month, type: 'expense' })
  const { isPrivate } = usePrivacyMode()

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-32 mb-4" />
        <div className="h-48 bg-white/5 rounded" />
      </div>
    )
  }

  // Raggruppa per categoria
  const grouped = new Map<string, { name: string; color: string; total: number }>()
  for (const t of transactions ?? []) {
    const cat = t.category
    const key = cat?.id ?? 'senza-categoria'
    const existing = grouped.get(key)
    if (existing) {
      existing.total += t.amount
    } else {
      grouped.set(key, {
        name: cat ? `${cat.icon ?? ''} ${cat.name}` : 'Senza categoria',
        color: cat?.color ?? '#6b7280',
        total: t.amount,
      })
    }
  }

  const chartData = Array.from(grouped.values()).sort((a, b) => b.total - a.total)
  const totalExpense = chartData.reduce((sum, d) => sum + d.total, 0)

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Uscite per categoria</h3>
        <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
          Nessuna uscita questo mese
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Uscite per categoria</h3>
      <div className="flex gap-4 items-center">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v, name) => [isPrivate ? '••••' : formatEur(Number(v)), String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {chartData.slice(0, 6).map((d, i) => {
            const pct = totalExpense > 0 ? (d.total / totalExpense) * 100 : 0
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-400 truncate">{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                  <span className="text-xs text-white"><PrivacyValue>{formatEur(d.total)}</PrivacyValue></span>
                </div>
              </div>
            )
          })}
          {chartData.length > 6 && (
            <span className="text-xs text-gray-600">+{chartData.length - 6} altre</span>
          )}
          <div className="mt-1 pt-1.5 border-t border-white/10 flex justify-between">
            <span className="text-xs text-gray-500">Totale</span>
            <span className="text-xs font-medium text-white"><PrivacyValue>{formatEur(totalExpense)}</PrivacyValue></span>
          </div>
        </div>
      </div>
    </div>
  )
}
