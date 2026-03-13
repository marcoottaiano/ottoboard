import { ActivityHeatmap } from '@/components/fitness/ActivityHeatmap'
import { ActivityList } from '@/components/fitness/ActivityList'
import { HeartRateChart } from '@/components/fitness/HeartRateChart'
import { LastActivityCard } from '@/components/fitness/LastActivityCard'
import { PaceTrendChart } from '@/components/fitness/PaceTrendChart'
import { PersonalRecordsCard } from '@/components/fitness/PersonalRecordsCard'
import { StravaConnect } from '@/components/fitness/StravaConnect'
import { WeekStatsCard } from '@/components/fitness/WeekStatsCard'
import { WeeklyVolumeChart } from '@/components/fitness/WeeklyVolumeChart'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function isStravaConnected(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('strava_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}

export default async function FitnessPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const connected = await isStravaConnected(user.id)

  if (!connected) {
    return (
      <main className="flex-1 p-6">
        <StravaConnect mode="full" />
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header con sync compatto */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Fitness</h1>
        <StravaConnect mode="compact" />
      </div>

      {/* Hero: ultima attività + stats settimanali — altezza uniforme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 items-stretch">
        <LastActivityCard />
        <WeekStatsCard />
      </div>

      {/* Personal records corsa */}
      <PersonalRecordsCard />

      {/* Grafici volume e pace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <WeeklyVolumeChart />
        <PaceTrendChart />
      </div>

      {/* FC corsa e heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <HeartRateChart />
        <ActivityHeatmap />
      </div>

      {/* Lista attività */}
      <ActivityList />
    </main>
  )
}
