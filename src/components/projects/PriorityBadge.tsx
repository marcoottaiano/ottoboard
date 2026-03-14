import { TaskPriority } from '@/types'

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low:    { label: 'Bassa',   className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  medium: { label: 'Media',   className: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  high:   { label: 'Alta',    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  urgent: { label: 'Urgente', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function PriorityBadge({ priority }: { priority: TaskPriority | null }) {
  if (!priority) return null
  const { label, className } = PRIORITY_CONFIG[priority]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${className}`}>
      {label}
    </span>
  )
}
