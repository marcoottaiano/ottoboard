'use client'

import { useTransactions } from '@/hooks/useTransactions'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function last6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthShortLabel(month: string) {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('it-IT', { month: 'short' })
}

export function MonthlyBarChart() {
  const { data: transactions, isLoading } = useTransactions({})

  // Filtra client-side per gli ultimi 6 mesi
  const months = last6Months()
  const chartData = months.map((month) => {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1).toISOString().slice(0, 10)
    const end = new Date(year, m, 0).toISOString().slice(0, 10)
    const monthTx = (transactions ?? []).filter((t) => t.date >= start && t.date <= end)
    const entrate = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const uscite = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { label: monthShortLabel(month), entrate, uscite, saldo: entrate - uscite }
  })

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-40 mb-4" />
        <div className="h-48 bg-white/5 rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Entrate vs Uscite (6 mesi)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(v, name) => [
              formatEur(Number(v)),
              name === 'entrate' ? 'Entrate' : name === 'uscite' ? 'Uscite' : 'Saldo',
            ]}
          />
          <Bar dataKey="entrate" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar dataKey="uscite" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Line type="monotone" dataKey="saldo" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
