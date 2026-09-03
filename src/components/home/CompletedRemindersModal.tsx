"use client";

import { DataError } from "@/components/ui/DataError";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { useCompletedReminders, useReopenReminder } from "@/hooks/useReminders";

const PAGE_SIZE = 20;

function formatLocalDate(dateStr: string): string {
  // Parse as local date to avoid UTC offset bug (DATE columns = YYYY-MM-DD)
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // completed_at is a TIMESTAMPTZ — UTC-to-local conversion is correct here
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  onClose: () => void;
}

export function CompletedRemindersModal({ onClose }: Props) {
  const { data: reminders = [], isLoading, isError, refetch } = useCompletedReminders();
  const reopening = useRef(false);
  const reopenReminder = useReopenReminder();
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(reminders.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const visible = reminders.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <AppDialog
      title="Promemoria completati"
      description="Consulta lo storico e riapri un promemoria."
      onClose={onClose}
      busy={reopenReminder.isPending}
      className="max-w-lg"
    >
      <div className="flex-1 overflow-y-auto">
        {isError ? (
          <DataError onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="p-6 text-center text-sm text-wm-muted-foreground">Caricamento...</div>
        ) : visible.length === 0 ? (
          <div className="p-6 text-center text-sm text-wm-muted-foreground">Nessun promemoria completato</div>
        ) : (
          <div className="divide-y divide-wm-border">
            {visible.map((r) => (
              <div key={r.id} className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="break-words text-sm text-wm-muted-foreground line-through">{r.title}</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-wm-muted-foreground">
                    <span>Scadenza: {formatLocalDate(r.due_date)}</span>
                    {r.completed_at && <span>· Completato: {formatDate(r.completed_at)}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  disabled={reopenReminder.isPending}
                  onClick={() => {
                    if (!reopening.current) {
                      reopening.current = true;
                      reopenReminder.mutate(r.id, {
                        onError: () => toast.error("Riapertura non riuscita. Riprova."),
                        onSettled: () => {
                          reopening.current = false;
                        },
                      });
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-wm-muted-foreground hover:text-wm-primary transition-colors"
                >
                  <RotateCcw size={12} />
                  Riapri
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap gap-2 items-center justify-between py-3 border-t border-wm-border flex-shrink-0">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="text-xs text-wm-muted-foreground hover:text-wm-muted-foreground disabled:opacity-30"
          >
            ← Precedente
          </Button>
          <span className="text-xs text-wm-muted-foreground">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="text-xs text-wm-muted-foreground hover:text-wm-muted-foreground disabled:opacity-30"
          >
            Successiva →
          </Button>
        </div>
      )}
    </AppDialog>
  );
}
