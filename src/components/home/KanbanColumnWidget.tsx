'use client'

import { Settings } from 'lucide-react'
import { useColumns } from '@/hooks/useColumns'
import { useTasks, tasksByColumn } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { ColorDot } from '@/components/projects/ColorDot'
import { DueDateBadge } from '@/components/projects/DueDateBadge'
import { PriorityBadge } from '@/components/projects/PriorityBadge'
import { WidgetConfig } from '@/hooks/useDashboardWidgets'

interface Props {
  config: WidgetConfig
}

export function KanbanColumnWidget({ config }: Props) {
  const { projectId, columnId } = config
  const { data: projects = [] } = useProjects()
  const { data: columns = [] } = useColumns(projectId ?? null)
  const { data: allTasks = [], isLoading } = useTasks(projectId ?? null)

  if (!projectId || !columnId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-gray-600 min-h-[200px] p-5">
        <Settings size={20} />
        <p className="text-xs">Configura il widget</p>
        <p className="text-xs text-gray-700">Scegli progetto e colonna dall&apos;icona ⚙</p>
      </div>
    )
  }

  const project = projects.find((p) => p.id === projectId)
  const column = columns.find((c) => c.id === columnId)
  const tasks = tasksByColumn(allTasks, columnId)

  return (
    <div className="p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 min-w-0">
        <ColorDot color={project?.color ?? null} size="sm" />
        <span className="text-xs text-gray-500 truncate">{project?.name ?? '—'}</span>
        <span className="text-gray-700 text-xs">/</span>
        <span className="text-xs text-gray-300 font-medium truncate">{column?.name ?? '—'}</span>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-1 overflow-y-auto max-h-48">
          {tasks.slice(0, 8).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {task.priority && <PriorityBadge priority={task.priority} />}
              <span className="flex-1 text-xs text-gray-300 truncate">{task.title}</span>
              {task.due_date && <DueDateBadge dueDate={task.due_date} />}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600 text-center py-4">Nessuna task in questa colonna</p>
      )}
    </div>
  )
}
