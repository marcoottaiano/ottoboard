import { SupabaseClient } from '@supabase/supabase-js'
import { stravaFetch } from './client'
import { StravaActivity, StravaAthlete } from './types'

const PER_PAGE = 100

export async function getActivitiesAfter(
  userId: string,
  supabase: SupabaseClient,
  after?: Date
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = []
  let page = 1

  const afterEpoch = after ? Math.floor(after.getTime() / 1000) : undefined

  while (true) {
    const params = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
    })
    if (afterEpoch) params.set('after', String(afterEpoch))

    const batch = await stravaFetch<StravaActivity[]>(
      `/athlete/activities?${params}`,
      userId,
      supabase
    )

    if (batch.length === 0) break
    all.push(...batch)
    if (batch.length < PER_PAGE) break
    page++
  }

  return all
}

export async function getAthlete(
  userId: string,
  supabase: SupabaseClient
): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>('/athlete', userId, supabase)
}
