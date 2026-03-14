'use client'

import { useState } from 'react'
import { useProjects, } from '@/hooks/useProjects'
import { useArchiveProject } from '@/hooks/useProjectMutations'
import { useTasks } from '@/hooks/useTasks'
import { Project } from '@/types'
import { ColorDot } from './ColorDot'
import { ProjectFormModal } from './ProjectFormModal'
import { Plus, ChevronDown, ChevronUp, Archive } from 'lucide-react'

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

function ProjectItem({
  project,
  isSelected,
  onSelect,
}: {
  project: Project
  isSelected: boolean
  onSelect: () => void
}) {
  const { data: tasks = [] } = useTasks(project.id)
  const archiveProject = useArchiveProject()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
      onClick={onSelect}
    >
      <ColorDot color={project.color} size="sm" />
      <span className={`flex-1 text-sm truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
        {project.name}
      </span>
      <span className="text-xs text-gray-700 flex-shrink-0">{tasks.length}</span>

      {confirming ? (
        <div
          className="flex items-center gap-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => archiveProject.mutate(project.id)}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Sì
          </button>
          <button onClick={() => setConfirming(false)} className="text-gray-500">No</button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
          className="opacity-0 group-hover:opacity-100 text-gray-700 hover:text-amber-400 transition-opacity p-0.5"
          title="Archivia"
        >
          <Archive size={11} />
        </button>
      )}
    </div>
  )
}

export function ProjectSidebar({ selectedId, onSelect }: Props) {
  const { data: projects = [], isLoading } = useProjects()
  const [showForm, setShowForm] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleCreate = (newId?: string) => {
    setShowForm(false)
    if (newId) onSelect(newId)
  }

  return (
    <>
      <div className="hidden md:flex w-52 flex-shrink-0 flex-col border-r border-white/5 bg-black/20 overflow-hidden">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-between px-4 py-3 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
        >
          <span>PROGETTI</span>
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>

        {!collapsed && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {isLoading ? (
              <div className="space-y-1 p-2 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-white/5 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {projects.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    isSelected={p.id === selectedId}
                    onSelect={() => onSelect(p.id)}
                  />
                ))}

                {projects.length === 0 && (
                  <p className="text-xs text-gray-700 px-3 py-2">Nessun progetto</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="px-2 pb-3 border-t border-white/5 pt-2">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
          >
            <Plus size={13} /> Nuovo progetto
          </button>
        </div>
      </div>

      {showForm && (
        <ProjectFormModal mode="create" onClose={handleCreate} />
      )}
    </>
  )
}
