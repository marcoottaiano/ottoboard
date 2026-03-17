import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(request: Request) {
  const secret = process.env.PUSH_NOTIFICATIONS_SECRET
  const authHeader = request.headers.get('Authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const today = new Date().toISOString().slice(0, 10)

  // Fetch overdue/today reminders not yet notified
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, user_id, title, due_date')
    .lte('due_date', today)
    .eq('completed', false)
    .is('notified_at', null)

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  const notifiedIds: string[] = []

  for (const reminder of reminders) {
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
      // If subscription is gone (410 Gone), clean it up
      if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', reminder.user_id)
      }
    }
  }

  // Mark reminders as notified
  if (notifiedIds.length > 0) {
    await supabase
      .from('reminders')
      .update({ notified_at: new Date().toISOString() })
      .in('id', notifiedIds)
  }

  return NextResponse.json({ sent })
}
