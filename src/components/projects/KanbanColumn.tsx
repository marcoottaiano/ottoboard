'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column, Task } from '@/types'
import { TaskCard } from './TaskCard'
import { ColorDot } from './ColorDot'
import { useUpdateColumn, useDeleteColumn } from '@/hooks/useColumnMutations'
import { GripVertical, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface Props {
  column: Column
  tasks: Task[]
  isDragging?: boolean
  isLinear?: boolean
  onTaskClick: (taskId: string) => void
  onAddTask: (columnId: string) => void
}

export function KanbanColumn({ column, tasks, isDragging = false, isLinear = false, onTaskClick, onAddTask }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({
      id: column.id,
      data: { type: 'column', column },
      disabled: isDragging || isLinear,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(column.name)
  const [confirming, setConfirming] = useState(false)

  const updateColumn = useUpdateColumn()
  const deleteColumn = useDeleteColumn()

  const handleSaveName = async () => {
    if (editName.trim() && editName.trim() !== column.name) {
      await updateColumn.mutateAsync({ id: column.id, project_id: column.project_id, name: editName.trim() })
    }
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group w-72 flex-shrink-0 flex flex-col rounded-xl bg-white/5 border border-white/10
        ${isSortableDragging ? 'opacity-40' : ''}
        ${isDragging ? 'shadow-2xl ring-1 ring-purple-500/30' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        {!isLinear && (
          <button
            {...attributes}
            {...listeners}
            className="text-gray-700 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-0.5"
          >
            <GripVertical size={14} />
          </button>
        )}

        {column.color && <ColorDot color={column.color} size="sm" />}

        {editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-300 truncate">{column.name}</span>
        )}

        <span className="text-xs text-gray-600 flex-shrink-0">{tasks.length}</span>

        {!editing && !isLinear && (
          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {confirming ? (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => deleteColumn.mutate({ id: column.id, project_id: column.project_id })}
                  className="text-red-400 hover:text-red-300"
                >
                  <Check size={12} />
                </button>
                <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-400">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setEditName(column.name); setEditing(true) }} className="text-gray-600 hover:text-gray-400 p-0.5">
                  <Pencil size={11} />
                </button>
                <button onClick={() => setConfirming(true)} className="text-gray-600 hover:text-red-400 p-0.5">
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[48px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>
      </div>

      {/* Footer */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
        >
          <Plus size={13} /> Aggiungi task
        </button>
      </div>
    </div>
  )
}
