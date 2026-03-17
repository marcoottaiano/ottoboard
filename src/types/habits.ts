export type HabitFrequency = 'daily' | 'weekly'

export const HABIT_COLORS = [
  { name: 'teal',   value: '#2dd4bf' },
  { name: 'orange', value: '#fb923c' },
  { name: 'purple', value: '#c084fc' },
  { name: 'blue',   value: '#60a5fa' },
  { name: 'green',  value: '#4ade80' },
  { name: 'pink',   value: '#f472b6' },
  { name: 'yellow', value: '#facc15' },
  { name: 'red',    value: '#f87171' },
] as const

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  frequency: HabitFrequency
  target_days: number[]   // 1=Mon … 7=Sun
  archived: boolean
  created_at: string
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  date: string            // YYYY-MM-DD
  created_at: string
}

export interface HabitWithStats extends Habit {
  streak: number
  completedToday: boolean
}

export type CreateHabitInput = Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'target_days'>
export type UpdateHabitInput = Partial<CreateHabitInput>
