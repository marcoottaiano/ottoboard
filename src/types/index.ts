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

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: CategoryType
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

// ─── UI Types ─────────────────────────────────────────────────────────────────

export type Module = 'fitness' | 'finance' | 'projects'

export interface NavItem {
  href: string
  label: string
  module: Module | 'home'
}
