'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Activity, BarChart2, Wallet, PiggyBank, Columns, BellRing, Target, TrendingUp } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useColumns } from '@/hooks/useColumns'
import { useFinancialGoals } from '@/hooks/useFinancialGoals'
import { Select } from '@/components/ui/Select'
import {
  useAddWidget,
  useUpdateWidgetConfig,
  WidgetType,
  DashboardWidget,
} from '@/hooks/useDashboardWidgets'

// ─── Widget type catalogue ────────────────────────────────────────────────────

interface WidgetEntry {
  type: WidgetType
  icon: React.ReactNode
  label: string
  description: string
}

const WIDGET_CATALOGUE: WidgetEntry[] = [
  {
    type: 'last-activity',
    icon: <Activity size={20} />,
    label: 'Ultima attività',
    description: 'Ultima sessione Strava',
  },
  {
    type: 'week-stats',
    icon: <BarChart2 size={20} />,
    label: 'Stats settimanali',
    description: 'Riepilogo fitness della settimana',
  },
  {
    type: 'month-finance',
    icon: <Wallet size={20} />,
    label: 'Spese mensili',
    description: 'Spese e categorie del mese corrente',
  },
  {
    type: 'total-balance',
    icon: <PiggyBank size={20} />,
    label: 'Saldo totale',
    description: 'Bilancio complessivo entrate/uscite',
  },
  {
    type: 'kanban-column',
    icon: <Columns size={20} />,
    label: 'Colonna progetto',
    description: 'Task di una colonna Kanban',
  },
  {
    type: 'reminders',
    icon: <BellRing size={20} />,
    label: 'Promemoria',
    description: 'Lista promemoria e scadenze',
  },
  {
    type: 'habits',
    icon: <Target size={20} />,
    label: 'Abitudini',
    description: 'Abitudini di oggi con checklist',
  },
  {
    type: 'financial-goal',
    icon: <TrendingUp size={20} />,
    label: 'Obiettivo risparmio',
    description: 'Progresso verso un obiettivo finanziario',
  },
]

// ─── Kanban config pickers (shared) ──────────────────────────────────────────

function KanbanPickers({
  projectId,
  columnId,
  onProjectChange,
  onColumnChange,
}: {
  projectId: string
  columnId: string
  onProjectChange: (id: string) => void
  onColumnChange: (id: string) => void
}) {
  const { data: projects = [] } = useProjects()
  const { data: columns = [] } = useColumns(projectId || null)

  return (
    <div className="space-y-2">
      <Select
        value={projectId}
        onChange={(v) => { onProjectChange(v); onColumnChange('') }}
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Seleziona progetto..."
        showPlaceholder={false}
      />
      <Select
        value={columnId}
        onChange={onColumnChange}
        dropUp
        options={columns.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Seleziona colonna..."
        showPlaceholder={false}
        disabled={!projectId}
      />
    </div>
  )
}

// ─── Add widget modal ─────────────────────────────────────────────────────────

interface AddWidgetModalProps {
  onClose: () => void
  existingTypes: WidgetType[]
}

const SINGLETON_TYPES: WidgetType[] = [
  'last-activity',
  'week-stats',
  'month-finance',
  'total-balance',
  'reminders',
  'habits',
]

export function AddWidgetModal({ onClose, existingTypes }: AddWidgetModalProps) {
  const [selected, setSelected] = useState<WidgetType | null>(null)
  const [projectId, setProjectId] = useState('')
  const [columnId, setColumnId] = useState('')
  const [goalId, setGoalId] = useState('')
  const addWidget = useAddWidget()
  const { data: goals = [] } = useFinancialGoals()

  const visibleCatalogue = WIDGET_CATALOGUE.filter((w) => {
    if (SINGLETON_TYPES.includes(w.type)) {
      return !existingTypes.includes(w.type)
    }
    return true
  })

  const canAdd =
    selected !== null &&
    (selected !== 'kanban-column' || (!!projectId && !!columnId)) &&
    (selected !== 'financial-goal' || !!goalId)

  const handleAdd = () => {
    if (!selected || !canAdd) return
    const config =
      selected === 'kanban-column'
        ? { projectId, columnId }
        : selected === 'financial-goal'
        ? { goalId }
        : {}
    addWidget.mutate(
      { type: selected, config },
      {
        onSuccess: onClose,
        onError: () => toast.error("Errore durante l'aggiunta del widget"),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Aggiungi widget</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Widget tiles */}
        <div className="p-4 grid grid-cols-2 gap-2">
          {visibleCatalogue.map((w) => (
            <button
              key={w.type}
              onClick={() => {
                setSelected(w.type)
                setProjectId('')
                setColumnId('')
                setGoalId('')
              }}
              className={`flex flex-col gap-2 p-3 rounded-xl border text-left transition-colors ${
                selected === w.type
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/5 hover:border-white/15'
              }`}
            >
              <span className={selected === w.type ? 'text-purple-400' : 'text-gray-600'}>
                {w.icon}
              </span>
              <div>
                <p className="text-xs font-medium">{w.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{w.description}</p>
              </div>
            </button>
          ))}
          {visibleCatalogue.length === 0 && (
            <p className="col-span-2 text-xs text-gray-600 text-center py-4">
              Tutti i widget sono già presenti nella dashboard.
            </p>
          )}
        </div>

        {/* Kanban config pickers */}
        {selected === 'kanban-column' && (
          <div className="px-4 pb-2">
            <KanbanPickers
              projectId={projectId}
              columnId={columnId}
              onProjectChange={setProjectId}
              onColumnChange={setColumnId}
            />
          </div>
        )}

        {/* Financial goal picker */}
        {selected === 'financial-goal' && (
          <div className="px-4 pb-2">
            <Select
              value={goalId}
              onChange={setGoalId}
              dropUp
              options={goals.map((g) => ({ value: g.id, label: `${g.icon ?? ''} ${g.name}`.trim() }))}
              placeholder="Seleziona obiettivo..."
              showPlaceholder={false}
            />
            {goals.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">Nessun obiettivo creato. Creane uno in /finance.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!canAdd || addWidget.isPending}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {addWidget.isPending ? 'Aggiunta...' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Configure widget modal (kanban-column only) ──────────────────────────────

interface ConfigureWidgetModalProps {
  widget: DashboardWidget
  onClose: () => void
}

export function ConfigureWidgetModal({ widget, onClose }: ConfigureWidgetModalProps) {
  const [projectId, setProjectId] = useState(widget.config.projectId ?? '')
  const [columnId, setColumnId] = useState(widget.config.columnId ?? '')
  const [goalId, setGoalId] = useState(widget.config.goalId ?? '')
  const updateConfig = useUpdateWidgetConfig()
  const { data: goals = [] } = useFinancialGoals()

  const canSave =
    (widget.type === 'kanban-column' && !!projectId && !!columnId) ||
    (widget.type === 'financial-goal' && !!goalId)

  const handleSave = () => {
    if (!canSave) return
    const config =
      widget.type === 'kanban-column'
        ? { projectId, columnId }
        : { goalId }
    updateConfig.mutate({ id: widget.id, config }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Configura widget</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pickers */}
        <div className="p-4">
          {widget.type === 'kanban-column' && (
            <KanbanPickers
              projectId={projectId}
              columnId={columnId}
              onProjectChange={(v) => { setProjectId(v); setColumnId('') }}
              onColumnChange={setColumnId}
            />
          )}
          {widget.type === 'financial-goal' && (
            <Select
              value={goalId}
              onChange={setGoalId}
              dropUp
              options={goals.map((g) => ({ value: g.id, label: `${g.icon ?? ''} ${g.name}`.trim() }))}
              placeholder="Seleziona obiettivo..."
              showPlaceholder={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!canSave || updateConfig.isPending}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updateConfig.isPending ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
