import { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_CATEGORIES = [
  { name: 'Stipendio', icon: '💼', color: '#10b981', type: 'income', spending_type: null },
  { name: 'Freelance', icon: '💻', color: '#06b6d4', type: 'income', spending_type: null },
  { name: 'Cibo', icon: '🍔', color: '#f97316', type: 'expense', spending_type: 'needs' },
  { name: 'Sport', icon: '🏃', color: '#f59e0b', type: 'expense', spending_type: 'wants' },
  { name: 'Trasporti', icon: '🚗', color: '#8b5cf6', type: 'expense', spending_type: 'needs' },
  { name: 'Casa', icon: '🏠', color: '#ec4899', type: 'expense', spending_type: 'needs' },
  { name: 'Abbonamenti', icon: '📱', color: '#14b8a6', type: 'expense', spending_type: 'wants' },
  { name: 'Salute', icon: '💊', color: '#ef4444', type: 'expense', spending_type: 'needs' },
  { name: 'Svago', icon: '🎬', color: '#a855f7', type: 'expense', spending_type: 'wants' },
  { name: 'Altro', icon: '📦', color: '#6b7280', type: 'both', spending_type: null },
] as const

export async function seedDefaultCategories(userId: string, supabase: SupabaseClient) {
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }))
  const { error } = await supabase.from('categories').insert(rows)
  if (error) throw error
}
