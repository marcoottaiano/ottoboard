"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Trash2, Settings, GripVertical, ArrowUpRight } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRemoveWidget } from "@/hooks/useDashboardWidgets";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
interface Props {
  widgetId: string;
  href?: string;
  configurable?: boolean;
  onConfigure?: () => void;
  children: ReactNode;
}
export function WidgetShell({ widgetId, href, configurable, onConfigure, children }: Props) {
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveWidget();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetId });
  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex min-w-0 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1">{children}</div>
      <div className="flex flex-wrap items-center gap-1 border-t border-wm-border px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          {...listeners}
          {...attributes}
          className="min-h-11 min-w-11 touch-none cursor-grab active:cursor-grabbing"
          aria-label="Riordina widget"
        >
          <GripVertical size={16} />
        </Button>
        {href && (
          <Link
            href={href}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-lg px-2 text-xs text-wm-muted-foreground hover:text-wm-primary"
          >
            Vai alla sezione
            <ArrowUpRight size={14} />
          </Link>
        )}
        {configurable && onConfigure && (
          <Button variant="ghost" size="icon" onClick={onConfigure} aria-label="Configura widget">
            <Settings size={16} />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => setConfirming(true)} aria-label="Rimuovi widget">
          <Trash2 size={16} />
        </Button>
      </div>
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Rimuovere il widget?"
        description="Verrà rimosso dalla Home. I dati associati rimarranno disponibili."
        confirmLabel="Rimuovi"
        pendingLabel="Rimozione..."
        onConfirm={() => remove.mutateAsync(widgetId)}
      />
    </Card>
  );
}
