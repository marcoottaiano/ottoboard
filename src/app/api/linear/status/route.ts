import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ connected: false })
  }

  const { data } = await supabase
    .from('linear_tokens')
    .select('selected_team_id, selected_team_name, last_synced_at')
    .eq('user_id', user.id)
    .single()

  if (!data) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    selectedTeamId: data.selected_team_id,
    selectedTeamName: data.selected_team_name,
    lastSyncedAt: data.last_synced_at,
  })
}
