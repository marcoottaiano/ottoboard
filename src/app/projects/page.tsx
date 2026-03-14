'use client'

import { useEffect, useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { useProjectStore } from '@/hooks/useProjectStore'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { ProjectSidebar } from '@/components/projects/ProjectSidebar'
import { ProjectFormModal } from '@/components/projects/ProjectFormModal'
import { ColorDot } from '@/components/projects/ColorDot'
import { Kanban, ChevronDown, Plus } from 'lucide-react'
import { useRef, useEffect as useClickOutside } from 'react'

export const dynamic = 'force-dynamic'

function MobileProjectBar({
  selectedId,
  onSelect,
  onNew,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const { data: projects = [] } = useProjects()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = projects.find((p) => p.id === selectedId)

  return (
    <div className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-black/20 relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex-1 flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        {selected ? (
          <>
            <ColorDot color={selected.color} size="sm" />
            <span className="font-medium truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">Seleziona progetto</span>
        )}
        <ChevronDown size={14} className={`ml-auto text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <button
        onClick={onNew}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs hover:bg-purple-500/30 transition-colors flex-shrink-0"
      >
        <Plus size={13} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 bg-[#0f0f1a] border-b border-white/10 shadow-xl">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                p.id === selectedId ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <ColorDot color={p.color} size="sm" />
              {p.name}
            </button>
          ))}
          {projects.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-600">Nessun progetto</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const { selectedProjectId, setSelectedProjectId } = useProjectStore()
  const { data: projects, isLoading } = useProjects()
  const [showNewProject, setShowNewProject] = useState(false)

  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId, setSelectedProjectId])

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="hidden md:block w-52 border-r border-white/5 bg-black/20 animate-pulse" />
        <div className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-72 h-64 bg-white/5 rounded-xl animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hasProjects = (projects?.length ?? 0) > 0

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Mobile top bar */}
      <MobileProjectBar
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
        onNew={() => setShowNewProject(true)}
      />

      {/* Desktop sidebar */}
      <ProjectSidebar
        selectedId={selectedProjectId}
        onSelect={setSelectedProjectId}
      />

      <div className="flex-1 overflow-hidden">
        {selectedProjectId && hasProjects ? (
          <KanbanBoard projectId={selectedProjectId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
            <Kanban size={40} className="text-purple-400/40" />
            <div>
              <p className="text-gray-400 font-medium">Nessun progetto</p>
              <p className="text-sm text-gray-600 mt-1">Crea il tuo primo progetto per iniziare</p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors"
            >
              Crea progetto
            </button>
          </div>
        )}
      </div>

      {showNewProject && (
        <ProjectFormModal
          mode="create"
          onClose={(newId) => {
            setShowNewProject(false)
            if (newId) setSelectedProjectId(newId)
          }}
        />
      )}
    </div>
  )
}
