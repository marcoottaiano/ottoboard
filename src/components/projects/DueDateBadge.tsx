import { Calendar } from 'lucide-react'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  const colorClass =
    diffDays < 0 ? 'text-red-400' :
    diffDays <= 1 ? 'text-amber-400' :
    'text-gray-500'

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${colorClass}`}>
      <Calendar size={11} />
      {formatDate(dueDate)}
    </span>
  )
}
