import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

interface LinearIssuePayload {
  id: string
  title?: string
  description?: string
  priority?: number
  state?: { id: string; name: string }
  assignee?: { name: string; avatarUrl?: string } | null
  project?: { id: string }
  identifier?: string
  url?: string
}

interface LinearWebhookPayload {
  type: string
  action: string
  data: LinearIssuePayload
}

// Constant-time HMAC comparison to prevent timing attacks
function verifyLinearSignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.LINEAR_WEBHOOK_SECRET
  if (!secret) {
    console.error('LINEAR_WEBHOOK_SECRET env var is not set — all webhook requests will be rejected')
    return false
  }
  const expected = createHmac('sha256', secret).update(body).digest()
  const received = Buffer.from(signature, 'hex')
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

const PRIORITY_MAP: Record<number, string | null> = {
  0: null,
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('linear-signature')

  if (!verifyLinearSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: LinearWebhookPayload
  try {
    payload = JSON.parse(rawBody) as LinearWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, action, data: issue } = payload

  // Only handle issue events
  if (type !== 'Issue') {
    return NextResponse.json({ ok: true })
  }

  if (!issue?.id) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient()

  if (action === 'remove') {
    const { error } = await supabase.from('tasks').delete().eq('linear_issue_id', issue.id)
    if (error) {
      console.error('Webhook: failed to delete task', { linearIssueId: issue.id, error: error.message })
      // Return 500 so Linear retries
      return NextResponse.json({ error: 'DB delete failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    // Find the task by linear_issue_id
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, column_id, project_id')
      .eq('linear_issue_id', issue.id)
      .single()

    if (fetchError || !existingTask) {
      // Issue not in local cache — ignore (reconciliation handles missing issues)
      return NextResponse.json({ ok: true })
    }

    const updates: Record<string, string | number | null> = {}

    // Find the target column from the new state
    if (issue.state?.id) {
      // linear_state_id is stored as `${linearProjectId}:${linearStateId}`
      // Match by stateId suffix scoped to this project
      const { data: targetColumn } = await supabase
        .from('columns')
        .select('id')
        .eq('project_id', existingTask.project_id)
        .like('linear_state_id', `%:${issue.state.id}`)
        .single()

      if (targetColumn) {
        updates.column_id = targetColumn.id
      }
    }

    if (issue.title !== undefined) updates.title = issue.title
    if (issue.description !== undefined) updates.description = issue.description ?? null
    if (issue.assignee !== undefined) {
      updates.assignee_name = issue.assignee?.name ?? null
      updates.assignee_avatar = issue.assignee?.avatarUrl ?? null
    }
    if (issue.priority !== undefined) {
      updates.priority = PRIORITY_MAP[issue.priority] ?? null
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('linear_issue_id', issue.id)
      if (updateError) {
        console.error('Webhook: failed to update task', { linearIssueId: issue.id, error: updateError.message })
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
