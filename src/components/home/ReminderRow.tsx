"use client";

import { Button } from "@/components/watermelon-ui/button";
import { Check } from "lucide-react";
import type { Reminder } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-wm-destructive/20 text-wm-destructive border-wm-destructive/30",
  high: "bg-wm-fitness/20 text-wm-fitness border-wm-fitness/30",
  medium: "bg-wm-warning/20 text-wm-warning border-wm-warning/30",
  low: "bg-wm-chart-blue/20 text-wm-chart-blue border-wm-chart-blue/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
};

function formatDueDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function isOverdue(dateStr: string): boolean {
  const parts = dateStr.split("-").map(Number);
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

interface Props {
  disabled?: boolean;
  reminder: Reminder;
  onComplete: (id: string) => void;
  onEdit: (r: Reminder) => void;
}

export function ReminderRow({ reminder, onComplete, onEdit, disabled = false }: Props) {
  const overdue = isOverdue(reminder.due_date);

  return (
    <div className="flex items-start gap-2.5 py-2 group">
      <Button
        variant="ghost"
        size="auto"
        onClick={(e) => {
          e.stopPropagation();
          onComplete(reminder.id);
        }}
        className="mt-0.5 min-h-11 min-w-11 p-2 rounded border border-wm-border flex-shrink-0 hover:border-wm-primary hover:bg-wm-primary/20 transition-colors"
        disabled={disabled}
        aria-label={`Completa ${reminder.title}`}
      >
        <Check size={16} />
      </Button>
      <Button
        variant="ghost"
        size="auto"
        onClick={() => onEdit(reminder)}
        className="min-w-0 flex-1 flex-col items-start gap-2 whitespace-normal text-left"
      >
        <span
          className={`w-full text-sm leading-snug break-words ${overdue ? "text-wm-destructive" : "text-wm-foreground"}`}
        >
          {reminder.title}
        </span>
        <span className="flex w-full flex-wrap items-center gap-1.5">
          {reminder.priority !== "none" && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[reminder.priority] ?? ""}`}>
              {PRIORITY_LABELS[reminder.priority]}
            </span>
          )}
          <span className={`text-xs ${overdue ? "text-wm-destructive" : "text-wm-muted-foreground"}`}>
            {formatDueDate(reminder.due_date)}
          </span>
        </span>
      </Button>
    </div>
  );
}
