'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '@/types'
import { PriorityBadge } from './PriorityBadge'
import { DueDateBadge } from './DueDateBadge'
import { LabelBadge } from './LabelBadge'

interface Props {
  task: Task
  isDragging?: boolean
  onClick: (taskId: string) => void
}

export function TaskCard({ task, isDragging = false, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({
      id: task.id,
      data: { type: 'task', task },
      disabled: isDragging,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasExtras = task.priority || task.due_date || task.labels.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task.id)}
      className={`
        bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer
        hover:bg-white/8 hover:border-white/20 transition-colors
        ${isSortableDragging ? 'opacity-40' : ''}
        ${isDragging ? 'shadow-2xl ring-1 ring-purple-500/30' : ''}
      `}
    >
      <p className="text-sm text-white line-clamp-2 leading-snug">{task.title}</p>

      {hasExtras && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <DueDateBadge dueDate={task.due_date} />
          <LabelBadge labels={task.labels} />
        </div>
      )}
    </div>
  )
}
