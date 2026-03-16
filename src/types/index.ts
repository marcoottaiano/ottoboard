// ─── Database Types ──────────────────────────────────────────────────────────

export type ActivityType = 'Run' | 'WeightTraining' | 'Walk' | 'Hike' | 'Ski'

export interface Activity {
  id: number
  user_id: string
  type: ActivityType
  name: string
  start_date: string
  distance: number | null
  moving_time: number
  elapsed_time: number
  average_heartrate: number | null
  max_heartrate: number | null
  average_pace: number | null
  calories: number | null
  kudos_count: number | null
  map_polyline: string | null
  raw_data: Record<string, unknown>
}

export type TransactionType = 'income' | 'expense'
export type CategoryType = 'income' | 'expense' | 'both'
export type SpendingType = 'needs' | 'wants' | 'savings'

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: CategoryType
  spending_type: SpendingType | null
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string
  description: string | null
  date: string
  created_at: string
  category?: Category
}

export interface Budget {
  id: string
  category_id: string
  amount: number
  month: string
}

export interface TransactionWithCategory extends Omit<Transaction, 'category'> {
  category: Category | null
}

export interface BudgetWithCategory extends Budget {
  category: Category
}

export interface MonthStats {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface MonthStatsDelta {
  income: number   // percentuale delta vs mese precedente
  expense: number
  balance: number
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  category_id: string
  description: string | null
  frequency: RecurringFrequency
  next_due_date: string  // DATE: YYYY-MM-DD
  is_active: boolean
  created_at: string
  category?: Category
}

export type ProjectStatus = 'active' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  status: ProjectStatus
  created_at: string
}

export interface Column {
  id: string
  project_id: string
  name: string
  position: number
  color: string | null
}

export interface Task {
  id: string
  column_id: string
  project_id: string
  title: string
  description: string | null
  priority: TaskPriority | null
  due_date: string | null
  labels: string[]
  position: number
  created_at: string
}

// ─── Body Measurements Types ──────────────────────────────────────────────────

export interface UserBodyProfile {
  user_id: string
  height_cm: number
  sex: 'male' | 'female'
  birth_date: string // YYYY-MM-DD
}

export interface BodyMeasurement {
  id: string
  user_id: string
  measured_at: string // YYYY-MM-DD
  weight_kg?: number
  // Plicometrie (mm)
  skinfold_chest?: number
  skinfold_abdomen?: number
  skinfold_thigh?: number
  skinfold_tricep?: number
  skinfold_suprailiac?: number
  skinfold_subscapular?: number
  skinfold_midaxillary?: number
  // Circonferenze (cm)
  circ_waist?: number
  circ_hip?: number
  circ_chest?: number
  circ_arm?: number
  circ_forearm?: number
  circ_thigh?: number
  circ_calf?: number
  circ_neck?: number
  // Calcolati
  body_fat_pct?: number
  fat_mass_kg?: number
  lean_mass_kg?: number
  created_at: string
}

export type CreateBodyMeasurementInput = Omit<BodyMeasurement, 'id' | 'user_id' | 'created_at'>

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type Module = 'fitness' | 'finance' | 'projects'

export interface NavItem {
  href: string
  label: string
  module: Module | 'home'
}
