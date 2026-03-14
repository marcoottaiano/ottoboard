'use client'

import { useState } from 'react'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjectMutations'
import { Project } from '@/types'
import { X } from 'lucide-react'

const PRESET_COLORS = [
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899',
]

interface Props {
  mode: 'create' | 'edit'
  project?: Project
  onClose: (newId?: string) => void
}

export function ProjectFormModal({ mode, project, onClose }: Props) {
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Inserisci un nome'); return }
    try {
      if (mode === 'create') {
        const id = await createProject.mutateAsync({ name: name.trim(), description: description.trim() || undefined, color })
        onClose(id)
      } else {
        await updateProject.mutateAsync({ id: project!.id, name: name.trim(), description: description.trim() || undefined, color })
        onClose()
      }
    } catch {
      setError('Errore durante il salvataggio')
    }
  }

  const isPending = createProject.isPending || updateProject.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl bg-[#0f0f1a] border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">
            {mode === 'create' ? 'Nuovo progetto' : 'Modifica progetto'}
          </h3>
          <button onClick={() => onClose()} className="text-gray-600 hover:text-gray-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="Nome progetto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
          />

          <textarea
            placeholder="Descrizione (opzionale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 resize-none"
          />

          {/* Color picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Colore</p>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform flex-shrink-0 ${color === c ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Salvo...' : mode === 'create' ? 'Crea progetto' : 'Salva modifiche'}
            </button>
            <button
              type="button"
              onClick={() => onClose()}
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
