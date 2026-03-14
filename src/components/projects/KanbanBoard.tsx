'use client'

import { useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { useColumns } from '@/hooks/useColumns'
import { useTasks, tasksByColumn } from '@/hooks/useTasks'
import { useCreateColumn, useReorderColumns } from '@/hooks/useColumnMutations'
import { useMoveTask } from '@/hooks/useTaskMutations'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { NewTaskModal } from './NewTaskModal'
import { TaskDetailModal } from './TaskDetailModal'
import { Column, Task } from '@/types'
import { Plus, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
}

export function KanbanBoard({ projectId }: Props) {
  const queryClient = useQueryClient()
  const { data: columns = [], isLoading: colLoading } = useColumns(projectId)
  const { data: allTasks = [], isLoading: taskLoading } = useTasks(projectId)

  const createColumn = useCreateColumn()
  const reorderColumns = useReorderColumns()
  const moveTask = useMoveTask()

  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [newColName, setNewColName] = useState('')
  const [showNewCol, setShowNewCol] = useState(false)
  const [addTaskColumnId, setAddTaskColumnId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const tasksSnapshot = useRef<Task[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    tasksSnapshot.current = queryClient.getQueryData<Task[]>(['tasks', projectId]) ?? []

    if (active.data.current?.type === 'column') {
      setActiveColumn(active.data.current.column as Column)
    } else if (active.data.current?.type === 'task') {
      setActiveTask(active.data.current.task as Task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.data.current?.type !== 'task') return

    const activeTaskId = active.id as string
    const overId = over.id as string

    const currentTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]) ?? []
    const activeTaskData = currentTasks.find((t) => t.id === activeTaskId)
    if (!activeTaskData) return

    // Determine target column
    let targetColumnId: string
    if (over.data.current?.type === 'column') {
      targetColumnId = overId
    } else if (over.data.current?.type === 'task') {
      const overTask = currentTasks.find((t) => t.id === overId)
      if (!overTask) return
      targetColumnId = overTask.column_id
    } else return

    if (activeTaskData.column_id === targetColumnId) return

    // Move task to new column optimistically (append at end)
    const targetTasks = tasksByColumn(currentTasks, targetColumnId)
    const newPosition = (targetTasks.at(-1)?.position ?? 0) + 1000

    queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
      old.map((t) =>
        t.id === activeTaskId
          ? { ...t, column_id: targetColumnId, position: newPosition }
          : t
      )
    )
    if (activeTask) {
      setActiveTask({ ...activeTask, column_id: targetColumnId, position: newPosition })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveColumn(null)
    setActiveTask(null)

    if (!over) {
      // Rollback
      if (tasksSnapshot.current) {
        queryClient.setQueryData(['tasks', projectId], tasksSnapshot.current)
      }
      return
    }

    // Column reorder
    if (active.data.current?.type === 'column' && over.data.current?.type === 'column') {
      const oldIndex = columns.findIndex((c) => c.id === active.id)
      const newIndex = columns.findIndex((c) => c.id === over.id)
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(columns, oldIndex, newIndex)
        const updates = reordered.map((c, i) => ({ id: c.id, position: i + 1 }))
        // Optimistic update
        queryClient.setQueryData<Column[]>(['columns', projectId], reordered.map((c, i) => ({ ...c, position: i + 1 })))
        try {
          await reorderColumns.mutateAsync({ projectId, columns: updates })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['columns', projectId] })
        }
      }
      return
    }

    // Task reorder / move
    if (active.data.current?.type === 'task') {
      const currentTasks = queryClient.getQueryData<Task[]>(['tasks', projectId]) ?? []
      const activeTaskData = currentTasks.find((t) => t.id === active.id)
      if (!activeTaskData) return

      let targetColumnId = activeTaskData.column_id
      let newPosition = activeTaskData.position

      if (over.data.current?.type === 'task') {
        const overTask = currentTasks.find((t) => t.id === over.id)
        if (!overTask) return
        targetColumnId = overTask.column_id
        const columnTasks = tasksByColumn(currentTasks, targetColumnId).filter((t) => t.id !== active.id)
        const overIdx = columnTasks.findIndex((t) => t.id === over.id)
        const prev = columnTasks[overIdx - 1]?.position ?? 0
        const next = columnTasks[overIdx + 1]?.position ?? (overTask.position + 2000)
        newPosition = (prev + next) / 2
      } else if (over.data.current?.type === 'column') {
        targetColumnId = over.id as string
        const columnTasks = tasksByColumn(currentTasks, targetColumnId).filter((t) => t.id !== active.id)
        newPosition = (columnTasks.at(-1)?.position ?? 0) + 1000
      }

      // Final optimistic update
      queryClient.setQueryData<Task[]>(['tasks', projectId], (old = []) =>
        old.map((t) =>
          t.id === active.id
            ? { ...t, column_id: targetColumnId, position: newPosition }
            : t
        )
      )

      try {
        await moveTask.mutateAsync({ id: active.id as string, project_id: projectId, column_id: targetColumnId, position: newPosition })
      } catch {
        if (tasksSnapshot.current) {
          queryClient.setQueryData(['tasks', projectId], tasksSnapshot.current)
        }
      }
    }
  }

  const handleCreateColumn = async () => {
    const name = newColName.trim()
    if (!name) return
    const position = (columns.at(-1)?.position ?? 0) + 1
    await createColumn.mutateAsync({ project_id: projectId, name, position })
    setNewColName('')
    setShowNewCol(false)
  }

  if (colLoading || taskLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 md:p-6 min-h-full items-start">
            <SortableContext
              items={columns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={tasksByColumn(allTasks, col.id)}
                  onTaskClick={setOpenTaskId}
                  onAddTask={setAddTaskColumnId}
                />
              ))}
            </SortableContext>

            {/* New column */}
            <div className="w-72 flex-shrink-0">
              {showNewCol ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateColumn()
                      if (e.key === 'Escape') { setShowNewCol(false); setNewColName('') }
                    }}
                    placeholder="Nome colonna"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateColumn}
                      disabled={!newColName.trim() || createColumn.isPending}
                      className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                    >
                      Crea
                    </button>
                    <button
                      onClick={() => { setShowNewCol(false); setNewColName('') }}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCol(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/10 text-sm text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors"
                >
                  <Plus size={14} /> Nuova colonna
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} isDragging onClick={() => {}} />
          )}
          {activeColumn && (
            <KanbanColumn
              column={activeColumn}
              tasks={tasksByColumn(allTasks, activeColumn.id)}
              isDragging
              onTaskClick={() => {}}
              onAddTask={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {addTaskColumnId && (
        <NewTaskModal
          projectId={projectId}
          defaultColumnId={addTaskColumnId}
          onClose={() => setAddTaskColumnId(null)}
        />
      )}

      {openTaskId && (
        <TaskDetailModal
          taskId={openTaskId}
          projectId={projectId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  )
}
