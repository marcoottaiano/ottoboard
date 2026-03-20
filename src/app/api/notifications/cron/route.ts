import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// PUSH_NOTIFICATIONS_SECRET must match CRON_SECRET in Vercel env vars.
// Vercel Cron automatically sends: Authorization: Bearer {CRON_SECRET}
// Set PUSH_NOTIFICATIONS_SECRET = CRON_SECRET in Vercel dashboard — no code change needed.
export async function GET(request: Request) {
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  // Use UTC methods consistently to avoid date string UTC-shift bug
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const currentHour = now.getUTCHours()

  // --- Bucket A: reminders WITH due_time, due within this UTC hour window ---
  // due_date = today AND due_time in [HH:00:00, HH+1:00:00) AND notified_at IS NULL AND completed = false
  const windowStart = `${String(currentHour).padStart(2, '0')}:00:00`
  const nextHour = currentHour + 1
  const windowEnd = nextHour < 24
    ? `${String(nextHour).padStart(2, '0')}:00:00`
    : '24:00:00'

  const { data: bucketA } = await supabase
    .from('reminders')
    .select('id, user_id, title, due_date, due_time')
    .eq('due_date', today)
    .not('due_time', 'is', null)
    .gte('due_time', windowStart)
    .lt('due_time', windowEnd)
    .eq('completed', false)
    .is('notified_at', null)

  // --- Bucket B: reminders WITHOUT due_time, today only, sent at NOTIFY_HOUR_UTC ---
  // NOTIFY_HOUR_UTC = 7 → 9 AM CET (UTC+1 winter) / 9 AM CEST (UTC+2 summer, effectively 8 AM UTC)
  // Simple rule: always send at UTC hour 7 — close enough to 9 AM Italian time
  const NOTIFY_HOUR_UTC = 7
  const bucketBReminders: typeof bucketA = []
  if (currentHour === NOTIFY_HOUR_UTC) {
    const { data } = await supabase
      .from('reminders')
      .select('id, user_id, title, due_date, due_time')
      .eq('due_date', today)
      .is('due_time', null)
      .eq('completed', false)
      .is('notified_at', null)
    if (data) bucketBReminders.push(...data)
  }

  // --- Bucket C: overdue reminders (due_date < today), any time ---
  const { data: bucketC } = await supabase
    .from('reminders')
    .select('id, user_id, title, due_date, due_time')
    .lt('due_date', today)
    .eq('completed', false)
    .is('notified_at', null)

  const allReminders = [
    ...(bucketA ?? []),
    ...bucketBReminders,
    ...(bucketC ?? []),
  ]

  if (allReminders.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  const notifiedIds: string[] = []

  for (const reminder of allReminders) {
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', reminder.user_id)
      .maybeSingle()

    if (!sub) continue

    const isOverdue = reminder.due_date < today
    const body = isOverdue
      ? `Scaduto il ${reminder.due_date}`
      : 'In scadenza oggi'

    // Note: DB column is auth_key; web-push expects keys.auth — mapping is intentional
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth_key },
    }

    try {
      await webpush.sendNotification(
        pushSub,
        JSON.stringify({
          title: reminder.title,
          body,
          url: '/',
        })
      )
      notifiedIds.push(reminder.id)
      sent++
    } catch (err: unknown) {
      // 410 Gone: subscription is no longer valid — delete it to keep the table clean
      if (
        typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        (err as { statusCode: number }).statusCode === 410
      ) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
      }
    }
  }

  // Batch-mark reminders as notified to prevent duplicate sends
  if (notifiedIds.length > 0) {
    await supabase
      .from('reminders')
      .update({ notified_at: new Date().toISOString() })
      .in('id', notifiedIds)
  }

  return NextResponse.json({ sent })
}
