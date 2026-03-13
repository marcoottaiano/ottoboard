import { ActivityType } from '@/types'

const BADGE_STYLES: Record<ActivityType, { label: string; className: string }> = {
  Run: { label: 'Corsa', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  WeightTraining: { label: 'Palestra', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  Walk: { label: 'Camminata', className: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  Hike: { label: 'Escursione', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  Ski: { label: 'Sci', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
}

const DEFAULT_STYLE = { label: 'Altro', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }

interface ActivityBadgeProps {
  type: string
  className?: string
}

export function ActivityBadge({ type, className = '' }: ActivityBadgeProps) {
  const style = BADGE_STYLES[type as ActivityType] ?? DEFAULT_STYLE

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style.className} ${className}`}
    >
      {style.label}
    </span>
  )
}
