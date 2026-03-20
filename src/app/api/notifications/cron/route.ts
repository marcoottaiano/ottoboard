import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Vercel Hobby plan supports daily cron only (max 1 run/day).
// Cron runs at 07:00 UTC = 09:00 CET — all reminders due today + overdue sent at once.
// PUSH_NOTIFICATIONS_SECRET must match CRON_SECRET in Vercel env vars.
// Vercel Cron automatically sends: Authorization: Bearer {CRON_SECRET}
export async function GET(request: Request) {
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  // Use UTC methods to avoid date string UTC-shift bug (CET = UTC+1)
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`

  // Fetch all reminders due today or overdue, not yet notified and not completed
  const { data: allReminders } = await supabase
    .from('reminders')
    .select('id, user_id, title, due_date')
    .lte('due_date', today)
    .eq('completed', false)
    .is('notified_at', null)

  if (!allReminders || allReminders.length === 0) {
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
