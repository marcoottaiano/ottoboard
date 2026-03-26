'use client'

import type { ReactNode } from 'react'
import { X, Dumbbell, Target, Wallet } from 'lucide-react'
import {
  useWeeklyReviewSummary,
  type FitnessSummary,
  type HabitSummaryItem,
  type FinanceSummary,
} from '@/hooks/useWeeklyReviewSummary'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-500">{icon}</span>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5">{value}</p>
    </div>
  )
}

function FitnessSection({ data }: { data: FitnessSummary }) {
  if (data.count === 0) {
    return <p className="text-sm text-gray-500">No workouts last week</p>
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCell label="Sessions" value={String(data.count)} />
      <StatCell label="Distance" value={`${data.totalKm.toFixed(1)} km`} />
      <StatCell label="Duration" value={`${data.totalMinutes} min`} />
      <StatCell
        label="Calories"
        value={data.totalCalories > 0 ? `${data.totalCalories} kcal` : '—'}
      />
    </div>
  )
}

function HabitsSection({ habits }: { habits: HabitSummaryItem[] }) {
  if (habits.length === 0) {
    return <p className="text-sm text-gray-500">No habits scheduled last week</p>
  }
  return (
    <ul className="space-y-2">
      {habits.map((h) => (
        <li key={h.id} className="flex items-center gap-2">
          <span className="w-4 text-sm">{h.icon ?? '•'}</span>
          <span className="flex-1 text-sm text-gray-300 truncate">{h.name}</span>
          <span
            className={`text-xs font-medium tabular-nums ${
              h.completionPct >= 80
                ? 'text-teal-400'
                : h.completionPct >= 50
                ? 'text-orange-400'
                : 'text-red-400'
            }`}
          >
            {h.completionPct}%
          </span>
          <span className="text-xs text-gray-600">
            ({h.completed}/{h.scheduled})
          </span>
        </li>
      ))}
    </ul>
  )
}

function FinanceSection({ data }: { data: FinanceSummary }) {
  if (data.totalIncome === 0 && data.totalExpense === 0) {
    return <p className="text-sm text-gray-500">No transactions last week</p>
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Income</span>
        <span className="text-sm text-emerald-400 font-medium">
          +€{data.totalIncome.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Expenses</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-red-400 font-medium">
            -€{data.totalExpense.toFixed(2)}
          </span>
          {data.expenseDelta !== null && (
            <span
              className={`text-xs ${
                data.expenseDelta > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {data.expenseDelta > 0 ? '+' : ''}
              {data.expenseDelta}%
            </span>
          )}
        </div>
      </div>
      {data.topCategory && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Top category</span>
          <span className="text-sm text-gray-300">{data.topCategory}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function WeeklyReviewModal({ onClose }: Props) {
  const { data, isLoading } = useWeeklyReviewSummary()

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-semibold text-white">Weekly Review</h2>
            {data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {data.weekStart} — {data.weekEnd}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors"
            aria-label="Chiudi"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              <div>
                <SectionHeader
                  icon={<Dumbbell size={13} />}
                  title="Fitness"
                />
                <FitnessSection
                  data={
                    data?.fitness ?? {
                      count: 0,
                      totalKm: 0,
                      totalCalories: 0,
                      totalMinutes: 0,
                    }
                  }
                />
              </div>

              <div className="border-t border-white/5" />

              <div>
                <SectionHeader icon={<Target size={13} />} title="Habits" />
                <HabitsSection habits={data?.habits ?? []} />
              </div>

              <div className="border-t border-white/5" />

              <div>
                <SectionHeader icon={<Wallet size={13} />} title="Finance" />
                <FinanceSection
                  data={
                    data?.finance ?? {
                      totalIncome: 0,
                      totalExpense: 0,
                      topCategory: null,
                      expenseDelta: null,
                    }
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
