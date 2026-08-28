'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDashboardWidgets,
  useReorderWidgets,
  DashboardWidget,
  WidgetType,
} from '@/hooks/useDashboardWidgets'
import { WidgetShell } from '@/components/home/WidgetShell'
import { AddWidgetModal, ConfigureWidgetModal } from '@/components/home/AddWidgetModal'
import { LastActivityCard } from '@/components/fitness/LastActivityCard'
import { FinancialGoalWidget } from '@/components/home/FinancialGoalWidget'
import { WeeklyReviewModal } from '@/components/home/WeeklyReviewModal'
import { getIsoWeekday, toLocalDateStr } from '@/lib/dateUtils'
import { OverviewPulse } from '@/components/home/OverviewPulse'
import { PageHeader } from '@/components/ui/PageHeader'

const WEEKLY_REVIEW_LS_KEY = 'last_weekly_review_shown'
const COMPLEMENTARY_WIDGET_TYPES: WidgetType[] = ['last-activity', 'financial-goal']

export const dynamic = 'force-dynamic'

function getWidgetHref(type: WidgetType): string | undefined {
  return type === 'financial-goal' ? '/finance' : '/fitness'
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  switch (widget.type) {
    case 'last-activity':
      return <LastActivityCard bare />
    case 'financial-goal':
      return <FinancialGoalWidget goalId={widget.config.goalId ?? ''} />
    default:
      return null
  }
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const { data: widgets = [], isLoading } = useDashboardWidgets()
  const reorderWidgets = useReorderWidgets()
  const [showAdd, setShowAdd] = useState(false)
  const [configuringWidget, setConfiguringWidget] = useState<DashboardWidget | null>(null)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)
  const todayLabel = new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(new Date())
  const complementaryWidgets = widgets.filter((widget) => COMPLEMENTARY_WIDGET_TYPES.includes(widget.type))

  useEffect(() => {
    const today = new Date()
    if (getIsoWeekday(today) !== 1) return
    const mondayStr = toLocalDateStr(today)
    if (localStorage.getItem(WEEKLY_REVIEW_LS_KEY) !== mondayStr) {
      setShowWeeklyReview(true)
    }
  }, [])

  const handleWeeklyReviewClose = () => {
    localStorage.setItem(WEEKLY_REVIEW_LS_KEY, toLocalDateStr(new Date()))
    setShowWeeklyReview(false)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = widgets.findIndex((w) => w.id === active.id)
    const newIdx = widgets.findIndex((w) => w.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(widgets, oldIdx, newIdx)
    // Optimistic update
    queryClient.setQueryData(
      ['dashboard-widgets'],
      reordered.map((w, i) => ({ ...w, position: i }))
    )
    reorderWidgets.mutate(reordered.map((w) => w.id))
  }

  return (
    <div className="ob-page">
      <PageHeader
        eyebrow={todayLabel}
        title="Buongiorno"
        description="Il quadro completo della tua giornata, già ordinato."
        actions={(
          <button onClick={() => setShowAdd(true)} className="ob-action">
            <Plus size={14} /> Aggiungi widget
          </button>
        )}
      />

      <OverviewPulse />

      <div className="ob-section-heading mt-8">
        <div>
          <p className="ob-section-title">Approfondimenti</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={complementaryWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
              {complementaryWidgets.map((w) => (
                <WidgetShell
                  key={w.id}
                  widgetId={w.id}
                  href={getWidgetHref(w.type) ?? undefined}
                  configurable={w.type === 'financial-goal'}
                  onConfigure={() => setConfiguringWidget(w)}
                >
                  <WidgetRenderer widget={w} />
                </WidgetShell>
              ))}

              {/* Add widget tile */}
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors min-h-[160px]"
              >
                <Plus size={16} />
                <span className="text-sm">Aggiungi approfondimento</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAdd && (
        <AddWidgetModal
          onClose={() => setShowAdd(false)}
          existingTypes={widgets.map((w) => w.type)}
          allowedTypes={COMPLEMENTARY_WIDGET_TYPES}
        />
      )}
      {configuringWidget && (
        <ConfigureWidgetModal
          widget={configuringWidget}
          onClose={() => setConfiguringWidget(null)}
        />
      )}
      {showWeeklyReview && (
        <WeeklyReviewModal onClose={handleWeeklyReviewClose} />
      )}
    </div>
  )
}
