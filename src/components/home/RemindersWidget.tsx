"use client";

import { DataError } from "@/components/ui/DataError";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { usePendingReminders, useCompleteReminder, useCompletedReminders } from "@/hooks/useReminders";
import { ReminderRow } from "./ReminderRow";
import { ReminderCreateModal } from "./ReminderCreateModal";
import { ReminderEditModal } from "./ReminderEditModal";
import { CompletedRemindersModal } from "./CompletedRemindersModal";
import type { Reminder } from "@/types";

export function RemindersWidget() {
  const { data: pending = [], isLoading, isError, refetch } = usePendingReminders();
  const { data: completed = [] } = useCompletedReminders();
  const completing = useRef(false);
  const completeReminder = useCompleteReminder();

  const [showCreate, setShowCreate] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={15} className="text-wm-primary" />
          <h3 className="text-sm font-semibold text-wm-foreground">Promemoria</h3>
        </div>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs text-wm-muted-foreground hover:text-wm-primary transition-colors"
        >
          <Plus size={13} />
          Aggiungi
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 bg-wm-muted rounded animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-wm-muted-foreground">Nessun promemoria in scadenza</p>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setShowCreate(true)}
            className="text-xs text-wm-primary hover:text-wm-primary transition-colors"
          >
            + Aggiungi promemoria
          </Button>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-wm-border">
          {pending.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              disabled={completeReminder.isPending}
              onComplete={(id) => {
                const reminder = pending.find((p) => p.id === id);
                if (reminder && !completing.current) {
                  completing.current = true;
                  completeReminder.mutate(reminder, {
                    onSettled: () => {
                      completing.current = false;
                    },
                  });
                }
              }}
              onEdit={setEditingReminder}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setShowCompleted(true)}
          className="text-xs text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors self-start"
        >
          Promemoria completati ({completed.length})
        </Button>
      }

      {showCreate && <ReminderCreateModal onClose={() => setShowCreate(false)} />}
      {editingReminder && <ReminderEditModal reminder={editingReminder} onClose={() => setEditingReminder(null)} />}
      {showCompleted && <CompletedRemindersModal onClose={() => setShowCompleted(false)} />}
    </div>
  );
}
