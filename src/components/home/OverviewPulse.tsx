'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Dumbbell, Plus, Wallet } from 'lucide-react'
import { useMonthStats } from '@/hooks/useMonthStats'
import { usePendingReminders, useCompleteReminder } from '@/hooks/useReminders'
import { useWeekStats } from '@/hooks/useWeekStats'
import { PrivacyValue } from '@/components/ui/PrivacyValue'
import { ReminderCreateModal } from '@/components/home/ReminderCreateModal'

const WEEKLY_TARGET = 5

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatEur(value: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function OverviewPulse() {
  const [showCreateReminder, setShowCreateReminder] = useState(false)
  const { current: week, isLoading: weekLoading } = useWeekStats()
  const { current: month, isLoading: monthLoading } = useMonthStats(currentMonth())
  const { data: reminders = [], isLoading: remindersLoading } = usePendingReminders()
  const completeReminder = useCompleteReminder()

  const sessions = week?.count ?? 0
  const progress = Math.min(Math.round((sessions / WEEKLY_TARGET) * 100), 100)
  const visibleReminders = reminders.slice(0, 3)

  return (
    <section className="ob-panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4 md:px-6" style={{ borderColor: 'var(--border)' }}>
        <p className="ob-eyebrow">Oggi</p>
        <span className="size-2 rounded-full bg-signal shadow-[0_0_18px_rgba(216,240,106,0.45)]" title="Dati aggiornati" />
      </div>

      <div className="grid lg:grid-cols-[1.05fr_1fr_1fr]">
        <div className="flex items-center gap-5 border-b p-5 md:p-6 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
          <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--brand) ${progress}%, rgba(101,214,166,0.1) ${progress}% 100%)` }}>
            <div className="grid size-[94px] place-items-center rounded-full bg-[#0b1b1e] text-center">
              <div>
                <p className="font-mono text-3xl leading-none tabular-nums">{weekLoading ? '—' : sessions}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted">sessioni</p>
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-fitness"><Dumbbell size={15} /><span className="ob-metric-label text-fitness">Allenamento</span></div>
            <p className="mt-3 font-mono text-2xl tabular-nums">{sessions} / {WEEKLY_TARGET}</p>
            <p className="mt-1 text-xs text-muted">{week?.distanceKm.toFixed(1) ?? '0,0'} km questa settimana</p>
            <Link href="/fitness" className="mt-4 inline-flex items-center gap-1 text-xs text-fitness hover:text-white">Apri Fitness <ArrowUpRight size={12} /></Link>
          </div>
        </div>

        <div className="border-b p-5 md:p-6 lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-brand"><Wallet size={15} /><span className="ob-metric-label text-brand">Saldo del mese</span></div>
          <p className="mt-6 ob-metric-value text-brand"><PrivacyValue>{monthLoading ? '—' : formatEur(month?.balance ?? 0)}</PrivacyValue></p>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div><p className="ob-metric-label">Entrate</p><p className="mt-1 font-mono text-sm text-brand tabular-nums"><PrivacyValue>{formatEur(month?.totalIncome ?? 0)}</PrivacyValue></p></div>
            <div><p className="ob-metric-label">Uscite</p><p className="mt-1 font-mono text-sm text-white/70 tabular-nums"><PrivacyValue>{formatEur(month?.totalExpense ?? 0)}</PrivacyValue></p></div>
          </div>
          <Link href="/finance" className="mt-4 inline-flex items-center gap-1 text-xs text-brand hover:text-white">Apri Finanze <ArrowUpRight size={12} /></Link>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="ob-metric-label">Promemoria</p>
              <span className="font-mono text-xs text-muted">{reminders.length}</span>
            </div>
            <button onClick={() => setShowCreateReminder(true)} className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-brand">
              <Plus size={12} /> Aggiungi
            </button>
          </div>
          <div className="mt-4 space-y-1">
            {remindersLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="h-9 animate-pulse rounded-lg bg-white/[0.04]" />)}</div>
            ) : visibleReminders.length === 0 ? (
              <p className="py-8 text-sm text-muted">Tutto sotto controllo.</p>
            ) : visibleReminders.map((reminder) => (
              <div key={reminder.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                <button onClick={() => completeReminder.mutate(reminder)} className="grid size-5 shrink-0 place-items-center rounded-md border text-transparent hover:border-brand hover:text-brand" style={{ borderColor: 'var(--border-strong)' }} aria-label={`Completa ${reminder.title}`}><Check size={12} /></button>
                <div className="min-w-0 flex-1"><p className="truncate text-xs text-white/80">{reminder.title}</p><p className="mt-0.5 text-[10px] text-muted">{new Date(`${reminder.due_date}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showCreateReminder ? <ReminderCreateModal onClose={() => setShowCreateReminder(false)} /> : null}
    </section>
  )
}
