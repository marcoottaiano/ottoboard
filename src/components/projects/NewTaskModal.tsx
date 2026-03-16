'use client'

import { useState } from 'react'
import { useCreateTask } from '@/hooks/useTaskMutations'
import { useTasks, tasksByColumn } from '@/hooks/useTasks'
import { Select } from '@/components/ui/Select'
import { TaskPriority } from '@/types'
import { X } from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

interface Props {
  projectId: string
  defaultColumnId: string
  isLinearProject?: boolean
  onClose: () => void
}

export function NewTaskModal({ projectId, defaultColumnId, isLinearProject, onClose }: Props) {
  const createTask = useCreateTask()
  const { data: allTasks = [] } = useTasks(projectId)

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Inserisci un titolo'); return }
    const columnTasks = tasksByColumn(allTasks, defaultColumnId)
    const lastPos = columnTasks.at(-1)?.position ?? 0
    const position = lastPos + 1000

    try {
      const newTask = await createTask.mutateAsync({
        project_id: projectId,
        column_id: defaultColumnId,
        title: title.trim(),
        priority: (priority as TaskPriority) || undefined,
        due_date: dueDate || undefined,
        position,
      })

      // Fire-and-forget: create in Linear if this is a Linear project
      if (isLinearProject && newTask?.id) {
        fetch('/api/linear/create-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: newTask.id,
            title: title.trim(),
            priority: priority || null,
            columnId: defaultColumnId,
          }),
        }).catch(() => {})
      }

      onClose()
    } catch {
      setError('Errore durante la creazione')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl bg-[#0f0f1a] border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Nuovo task</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="Titolo task"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
          />

          <div className="flex gap-2">
            <Select
              value={priority}
              onChange={setPriority}
              options={PRIORITY_OPTIONS}
              placeholder="Priorità (opz.)"
              className="flex-1"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {createTask.isPending ? 'Creando...' : 'Crea task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
