'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUpdateTask, useDeleteTask } from '@/hooks/useTaskMutations'
import { useColumns } from '@/hooks/useColumns'
import { Select } from '@/components/ui/Select'
import { Task, TaskPriority } from '@/types'
import { X, Trash2, Plus, ExternalLink, Save, CheckCircle } from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

interface Props {
  taskId: string
  projectId: string
  onClose: () => void
}

export function TaskDetailModal({ taskId, projectId, onClose }: Props) {
  const queryClient = useQueryClient()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: columns = [] } = useColumns(projectId)

  const task = (queryClient.getQueryData<Task[]>(['tasks', projectId]) ?? [])
    .find((t) => t.id === taskId)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState(task?.priority ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [columnId, setColumnId] = useState(task?.column_id ?? '')
  const [labels, setLabels] = useState<string[]>(task?.labels ?? [])
  const [labelInput, setLabelInput] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [isSavingLinear, setIsSavingLinear] = useState(false)
  const [linearSaved, setLinearSaved] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority ?? '')
      setDueDate(task.due_date ?? '')
      setColumnId(task.column_id)
      setLabels(task.labels ?? [])
    }
  }, [task])

  if (!task) return null

  const columnOptions = columns.map((c) => ({ value: c.id, label: c.name }))

  type PartialUpdate = Omit<Parameters<typeof updateTask.mutateAsync>[0], 'id' | 'project_id'>
  const saveField = async (updates: PartialUpdate) => {
    await updateTask.mutateAsync({ id: taskId, project_id: projectId, ...updates })
  }

  const handleSaveLinear = async () => {
    if (!task.linear_issue_id) return
    setIsSavingLinear(true)
    setLinearSaved(false)
    try {
      // Also save latest values to Supabase
      await updateTask.mutateAsync({
        id: taskId,
        project_id: projectId,
        title: title.trim() || task.title,
        description: description || null,
        priority: (priority as TaskPriority) || null,
        column_id: columnId,
      })

      // Extract real Linear stateId from virtual ID (format: "projectId:stateId")
      const selectedCol = columns.find((c) => c.id === columnId)
      const realStateId = selectedCol?.linear_state_id?.split(':').pop()

      const body: Record<string, unknown> = {
        issueId: task.linear_issue_id,
        title: title.trim() || task.title,
        description: description || null,
        priority: priority || null,
      }
      if (realStateId) body.stateId = realStateId

      const res = await fetch('/api/linear/update-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setLinearSaved(true)
        setTimeout(() => setLinearSaved(false), 3000)
      }
    } finally {
      setIsSavingLinear(false)
    }
  }

  const handleAddLabel = () => {
    const l = labelInput.trim()
    if (l && !labels.includes(l)) {
      const next = [...labels, l]
      setLabels(next)
      saveField({ labels: next })
    }
    setLabelInput('')
  }

  const handleRemoveLabel = (label: string) => {
    const next = labels.filter((l) => l !== label)
    setLabels(next)
    saveField({ labels: next })
  }

  const handleDelete = async () => {
    await deleteTask.mutateAsync({ id: taskId, project_id: projectId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-[#0f0f1a] border border-white/10 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && saveField({ title: title.trim() })}
            className="flex-1 bg-transparent text-base font-medium text-white focus:outline-none border-b border-transparent focus:border-white/20 pb-0.5"
            placeholder="Titolo task"
          />
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => saveField({ description: description || null })}
            placeholder="Descrizione..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 resize-y"
          />

          {/* Row: Colonna + Priorità */}
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Colonna</p>
              <Select
                value={columnId}
                onChange={(v) => { setColumnId(v); saveField({ column_id: v }) }}
                options={columnOptions}
                showPlaceholder={false}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 mb-1">Priorità</p>
              <Select
                value={priority}
                onChange={(v) => { setPriority(v); saveField({ priority: (v as TaskPriority) || null }) }}
                options={PRIORITY_OPTIONS}
                placeholder="Nessuna"
              />
            </div>
          </div>

          {/* Due date */}
          <div>
            <p className="text-xs text-gray-600 mb-1">Scadenza</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => saveField({ due_date: dueDate || null })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Labels */}
          <div>
            <p className="text-xs text-gray-600 mb-1">Labels</p>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400 border border-white/10"
                  >
                    {label}
                    <button onClick={() => handleRemoveLabel(label)} className="text-gray-600 hover:text-gray-300">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLabel() } }}
                placeholder="Aggiungi label..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="px-2 py-1.5 text-gray-500 hover:text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <p className="text-xs text-gray-700">
            Creato il {new Date(task.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>

          {/* Linear info */}
          {task.linear_identifier && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <p className="text-xs text-gray-600 font-medium">Linear</p>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-mono">{task.linear_identifier}</span>
                {task.linear_issue_url && (
                  <a
                    href={task.linear_issue_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-purple-400 transition-colors"
                  >
                    <ExternalLink size={11} /> Apri in Linear
                  </a>
                )}
              </div>
              {task.assignee_name && (
                <p className="text-xs text-gray-600">Assegnato a: <span className="text-gray-400">{task.assignee_name}</span></p>
              )}

              {/* Save to Linear button */}
              <button
                onClick={handleSaveLinear}
                disabled={isSavingLinear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30"
              >
                {linearSaved ? (
                  <><CheckCircle size={12} /> Salvato</>
                ) : (
                  <><Save size={12} /> {isSavingLinear ? 'Salvataggio...' : 'Salva in Linear'}</>
                )}
              </button>
            </div>
          )}

          {/* Delete */}
          <div className="pt-2 border-t border-white/5">
            {confirming ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Eliminare questo task?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleteTask.isPending}
                  className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                >
                  Elimina
                </button>
                <button onClick={() => setConfirming(false)} className="text-gray-500 hover:text-gray-400">
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} /> Elimina task
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
