'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Settings, GripVertical, ArrowUpRight } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRemoveWidget } from '@/hooks/useDashboardWidgets'

interface Props {
  widgetId: string
  href?: string
  configurable?: boolean
  onConfigure?: () => void
  children: React.ReactNode
}

export function WidgetShell({ widgetId, href, configurable, onConfigure, children }: Props) {
  const [confirming, setConfirming] = useState(false)
  const removeWidget = useRemoveWidget()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widgetId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl bg-white/5 border border-white/10 group flex flex-col"
    >
      {/* Widget content — no overflow-hidden so Select dropdowns can escape */}
      <div className="flex-1 min-h-0">{children}</div>

      {/* Action bar — always visible on mobile, hover-only on md+ */}
      <div className="border-t border-white/5 px-3 py-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="p-1.5 rounded text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
          title="Trascina per riordinare"
        >
          <GripVertical size={15} />
        </button>

        {/* Navigate link */}
        {href && !confirming && (
          <Link
            href={href}
            className="flex-1 flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
          >
            Vai alla sezione <ArrowUpRight size={11} />
          </Link>
        )}

        {/* Spacer when confirming */}
        {confirming && <div className="flex-1" />}

        {/* Configure */}
        {configurable && onConfigure && !confirming && (
          <button
            onClick={onConfigure}
            className="p-1.5 rounded text-gray-700 hover:text-gray-400 hover:bg-white/5 transition-colors"
            title="Configura widget"
          >
            <Settings size={15} />
          </button>
        )}

        {/* Remove */}
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rimuovere?</span>
            <button
              onClick={() => removeWidget.mutate(widgetId)}
              disabled={removeWidget.isPending}
              className="px-3 py-1 text-xs text-red-400 bg-red-500/15 border border-red-500/25 rounded-md font-medium hover:bg-red-500/25 transition-colors"
            >
              Sì
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="p-1.5 rounded text-gray-700 hover:text-red-400 hover:bg-white/5 transition-colors"
            title="Rimuovi widget"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
