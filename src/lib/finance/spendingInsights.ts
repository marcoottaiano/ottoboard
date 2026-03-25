import { Budget, TransactionWithCategory } from '@/types'

export interface SpendingInsight {
  type: 'spike' | 'budget-overrun' | 'expensive-day'
  message: string
  severity: 'warning' | 'info'
}

const WEEKDAY_NAMES = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function groupExpensesByMonth(transactions: TransactionWithCategory[]): Map<string, TransactionWithCategory[]> {
  const map = new Map<string, TransactionWithCategory[]>()

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    const key = transaction.date.slice(0, 7)
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)?.push(transaction)
  }

  return map
}

export function hasAtLeastOneMonthOfTransactionHistory(
  transactions: TransactionWithCategory[],
  today: Date
): boolean {
  const transactionDates = transactions.map((transaction) => parseLocalDate(transaction.date))

  if (transactionDates.length === 0) {
    return false
  }

  const oldest = new Date(Math.min(...transactionDates.map((date) => date.getTime())))
  const monthDelta =
    (today.getFullYear() - oldest.getFullYear()) * 12 +
    (today.getMonth() - oldest.getMonth())

  return monthDelta >= 1
}

export function computeSpendingInsights(
  transactions: TransactionWithCategory[],
  budgets: Budget[],
  today: Date
): SpendingInsight[] {
  const insights: SpendingInsight[] = []
  const expenses = transactions.filter((transaction) => transaction.type === 'expense')

  if (!hasAtLeastOneMonthOfTransactionHistory(transactions, today) || expenses.length === 0) {
    return []
  }

  const currentMonthKey = monthKeyFromDate(today)
  const byMonth = groupExpensesByMonth(expenses)
  const currentMonthExpenses = byMonth.get(currentMonthKey) ?? []

  const currentByCategory = new Map<string, { name: string; total: number }>()
  for (const expense of currentMonthExpenses) {
    const name = expense.category?.name ?? 'Sconosciuta'
    const existing = currentByCategory.get(expense.category_id) ?? { name, total: 0 }
    currentByCategory.set(expense.category_id, {
      name,
      total: existing.total + expense.amount,
    })
  }

  for (const budget of budgets) {
    if (!budget.month.startsWith(currentMonthKey)) continue

    const spent = currentByCategory.get(budget.category_id)?.total ?? 0
    if (spent <= budget.amount) continue

    const categoryFromBudget = (budget as Budget & { category?: { name?: string } | null }).category?.name
    const categoryName = categoryFromBudget ?? currentByCategory.get(budget.category_id)?.name ?? 'Sconosciuta'
    const overrun = spent - budget.amount

    insights.push({
      type: 'budget-overrun',
      message: `Hai superato il budget della categoria ${categoryName} di ${new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(overrun)}`,
      severity: 'warning',
    })
  }

  const expenseDates = expenses.map((transaction) => parseLocalDate(transaction.date))
  const oldest = new Date(Math.min(...expenseDates.map((date) => date.getTime())))
  const monthDelta =
    (today.getFullYear() - oldest.getFullYear()) * 12 +
    (today.getMonth() - oldest.getMonth())

  if (monthDelta < 3) {
    return insights
  }

  const previousThreeMonthKeys: string[] = []
  for (let offset = 1; offset <= 3; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
    previousThreeMonthKeys.push(monthKeyFromDate(date))
  }

  const averageByCategory = new Map<string, number>()
  for (const monthKey of previousThreeMonthKeys) {
    const monthExpenses = byMonth.get(monthKey) ?? []
    for (const expense of monthExpenses) {
      averageByCategory.set(
        expense.category_id,
        (averageByCategory.get(expense.category_id) ?? 0) + expense.amount
      )
    }
  }

  averageByCategory.forEach((total, categoryId) => {
    averageByCategory.set(categoryId, total / 3)
  })

  currentByCategory.forEach((current, categoryId) => {
    const average = averageByCategory.get(categoryId) ?? 0
    if (average <= 0) return

    const absoluteIncrease = current.total - average
    const percentIncrease = (absoluteIncrease / average) * 100

    if (percentIncrease > 20 && absoluteIncrease > 5) {
      insights.push({
        type: 'spike',
        message: `La categoria ${current.name} è aumentata del ${Math.round(percentIncrease)}% rispetto alla media degli ultimi 3 mesi`,
        severity: 'warning',
      })
    }
  })

  const weekdayTotals = new Array<number>(7).fill(0)
  const weekdayCounts = new Array<number>(7).fill(0)

  for (const monthKey of previousThreeMonthKeys) {
    const monthExpenses = byMonth.get(monthKey) ?? []
    for (const expense of monthExpenses) {
      const weekday = parseLocalDate(expense.date).getDay()
      weekdayTotals[weekday] += expense.amount
      weekdayCounts[weekday] += 1
    }
  }

  const weekdayAverages = weekdayTotals.map((total, index) => {
    return weekdayCounts[index] > 0 ? total / weekdayCounts[index] : 0
  })
  const maxAverage = Math.max(...weekdayAverages)
  const maxDay = weekdayAverages.indexOf(maxAverage)

  if (maxAverage > 0) {
    insights.push({
      type: 'expensive-day',
      message: `Il tuo giorno più costoso è tipicamente il ${WEEKDAY_NAMES[maxDay]}`,
      severity: 'info',
    })
  }

  return insights
}