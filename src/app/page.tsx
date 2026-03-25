'use client'

import { useState } from 'react'
import { Plus, LayoutDashboard } from 'lucide-react'
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
  useSeedDefaultWidgets,
  useReorderWidgets,
  DashboardWidget,
  WidgetType,
} from '@/hooks/useDashboardWidgets'
import { WidgetShell } from '@/components/home/WidgetShell'
import { AddWidgetModal, ConfigureWidgetModal } from '@/components/home/AddWidgetModal'
import { LastActivityCard } from '@/components/fitness/LastActivityCard'
import { WeekStatsCard } from '@/components/fitness/WeekStatsCard'
import { MonthFinanceWidget } from '@/components/home/MonthFinanceWidget'
import { TotalBalanceWidget } from '@/components/home/TotalBalanceWidget'
import { RemindersWidget } from '@/components/home/RemindersWidget'
import { HabitsWidget } from '@/components/home/HabitsWidget'
import { FinancialGoalWidget } from '@/components/home/FinancialGoalWidget'
import { NotificationPermissionBanner } from '@/components/home/NotificationPermissionBanner'

export const dynamic = 'force-dynamic'

function getWidgetHref(type: WidgetType): string | undefined {
  if (type === 'month-finance' || type === 'total-balance' || type === 'financial-goal') return '/finance'
  if (type === 'reminders') return undefined
  if (type === 'habits') return '/habits'
  return '/fitness'
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  switch (widget.type) {
    case 'last-activity':
      return <LastActivityCard bare />
    case 'week-stats':
      return <WeekStatsCard bare />
    case 'month-finance':
      return <MonthFinanceWidget />
    case 'total-balance':
      return <TotalBalanceWidget bare />
    case 'reminders':
      return <RemindersWidget />
    case 'habits':
      return <HabitsWidget />
    case 'financial-goal':
      return <FinancialGoalWidget goalId={widget.config.goalId ?? ''} />
    default:
      return null
  }
}

export default function HomePage() {
  const queryClient = useQueryClient()
  const { data: widgets = [], isLoading } = useDashboardWidgets()
  const seedDefaults = useSeedDefaultWidgets()
  const reorderWidgets = useReorderWidgets()
  const [showAdd, setShowAdd] = useState(false)
  const [configuringWidget, setConfiguringWidget] = useState<DashboardWidget | null>(null)

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
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white/90">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">La tua settimana in sintesi</p>
      </div>

      <NotificationPermissionBanner />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
              {widgets.map((w) => (
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

              {/* Empty state */}
              {widgets.length === 0 && (
                <div className="rounded-xl border border-white/[0.06] flex flex-col items-center justify-center gap-3 p-6 text-center min-h-[160px]">
                  <LayoutDashboard size={28} className="text-gray-700" />
                  <div>
                    <p className="text-sm text-gray-500">Dashboard vuota</p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      Aggiungi widget o ripristina i predefiniti
                    </p>
                  </div>
                  <button
                    onClick={() => seedDefaults.mutate()}
                    disabled={seedDefaults.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    {seedDefaults.isPending ? 'Ripristino...' : 'Ripristina predefiniti'}
                  </button>
                </div>
              )}

              {/* Add widget tile */}
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors min-h-[160px]"
              >
                <Plus size={16} />
                <span className="text-sm">Aggiungi widget</span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showAdd && (
        <AddWidgetModal
          onClose={() => setShowAdd(false)}
          existingTypes={widgets.map((w) => w.type)}
        />
      )}
      {configuringWidget && (
        <ConfigureWidgetModal
          widget={configuringWidget}
          onClose={() => setConfiguringWidget(null)}
        />
      )}
    </div>
  )
}
