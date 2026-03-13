'use client'

import { BudgetTracker } from '@/components/finance/BudgetTracker'
import { CSVImport } from '@/components/finance/CSVImport'
import { FirstTimeSetup } from '@/components/finance/FirstTimeSetup'
import { MonthlyBarChart } from '@/components/finance/MonthlyBarChart'
import { MonthlyHeader } from '@/components/finance/MonthlyHeader'
import { RuleCard5030 } from '@/components/finance/RuleCard5030'
import { SpendingPieChart } from '@/components/finance/SpendingPieChart'
import { TransactionForm } from '@/components/finance/TransactionForm'
import { TransactionList } from '@/components/finance/TransactionList'
import { useCategories } from '@/hooks/useCategories'
import { useState } from 'react'

export const dynamic = 'force-dynamic'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function FinancePage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [setupDone, setSetupDone] = useState(false)

  const { data: categories, isLoading } = useCategories()

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  const hasCategories = (categories?.length ?? 0) > 0 || setupDone

  if (!hasCategories) {
    return (
      <div className="p-4 md:p-6">
        <FirstTimeSetup onDone={() => setSetupDone(true)} />
      </div>
    )
  }

  return (
    <main className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Finanze</h1>
      </div>

      <MonthlyHeader selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <SpendingPieChart month={selectedMonth} />
        <MonthlyBarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <BudgetTracker month={selectedMonth} />
        <RuleCard5030 month={selectedMonth} />
      </div>

      <TransactionForm />

      <TransactionList month={selectedMonth} />

      <CSVImport month={selectedMonth} />
    </main>
  )
}
