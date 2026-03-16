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
        relative bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer
        hover:bg-white/8 hover:border-white/20 transition-colors
        ${isSortableDragging ? 'opacity-40' : ''}
        ${isDragging ? 'shadow-2xl ring-1 ring-purple-500/30' : ''}
      `}
    >
      {/* Linear identifier badge */}
      {task.linear_identifier && (
        <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-600 border border-white/10">
          {task.linear_identifier}
        </span>
      )}

      <p className="text-sm text-white line-clamp-2 leading-snug pr-12">{task.title}</p>

      {hasExtras && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <DueDateBadge dueDate={task.due_date} />
          <LabelBadge labels={task.labels} />
        </div>
      )}

      {/* Assignee avatar */}
      {task.assignee_name && (
        <div className="mt-2 flex justify-end">
          {task.assignee_avatar ? (
            <img
              src={task.assignee_avatar}
              alt={task.assignee_name}
              title={task.assignee_name}
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <span
              title={task.assignee_name}
              className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[8px] flex items-center justify-center font-medium"
            >
              {task.assignee_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
