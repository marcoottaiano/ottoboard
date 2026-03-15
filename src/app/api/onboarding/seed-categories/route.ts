import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { seedDefaultCategories } from '@/lib/finance/seedCategories'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Idempotent: skip if user already has categories
  const { count } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count && count > 0) {
    return NextResponse.json({ seeded: false, message: 'Categories already exist' })
  }

  await seedDefaultCategories(user.id, supabase)

  return NextResponse.json({ seeded: true })
}
