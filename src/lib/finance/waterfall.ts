import { FinancialGoal } from '@/types'

export function computeWaterfall(
  goals: FinancialGoal[],
  totalBalance: number
): Map<string, number> {
  const result = new Map<string, number>()
  let remaining = Math.max(0, totalBalance)

  for (const goal of goals) {
    if (goal.completed) continue

    const target = Math.max(0, goal.target_amount)
    const allocated = Math.min(remaining, target)
    result.set(goal.id, allocated)
    remaining = Math.max(0, remaining - allocated)
  }

  return result
}