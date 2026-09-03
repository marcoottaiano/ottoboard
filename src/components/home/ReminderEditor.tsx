"use client";
import { useRef, useState } from "react";
import { useCreateReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/useReminders";
import type { Reminder, ReminderPriority, ReminderRecurrence } from "@/types";
import { AppDialog } from "@/components/ui/AppDialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";

const priorities: { value: ReminderPriority; label: string }[] = [
  { value: "none", label: "Nessuna" },
  { value: "low", label: "Bassa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];
const recurrences: { value: ReminderRecurrence | ""; label: string }[] = [
  { value: "", label: "Nessuna" },
  { value: "daily", label: "Ogni giorno" },
  { value: "weekly", label: "Ogni settimana" },
  { value: "monthly", label: "Ogni mese" },
  { value: "yearly", label: "Ogni anno" },
];
export function ReminderEditor({ reminder, onClose }: { reminder?: Reminder; onClose: () => void }) {
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const remove = useDeleteReminder();
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [date, setDate] = useState(reminder?.due_date ?? "");
  const [time, setTime] = useState(reminder?.due_time ?? "");
  const [priority, setPriority] = useState<ReminderPriority>(reminder?.priority ?? "none");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence | "">(reminder?.recurrence ?? "");
  const [notes, setNotes] = useState(reminder?.notes ?? "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const busy = create.isPending || update.isPending || remove.isPending;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || busy || !title.trim() || !date) return;
    submitting.current = true;
    setError(null);
    const fields = {
      title: title.trim(),
      due_date: date,
      due_time: time || null,
      priority,
      recurrence: recurrence || null,
      notes: notes.trim() || null,
    };
    try {
      if (reminder) await update.mutateAsync({ id: reminder.id, ...fields });
      else await create.mutateAsync(fields);
      onClose();
    } catch {
      setError("Salvataggio non riuscito. I tuoi dati sono ancora qui: riprova.");
    } finally {
      submitting.current = false;
    }
  }
  return (
    <AppDialog
      title={reminder ? "Modifica promemoria" : "Nuovo promemoria"}
      description="Organizza scadenza, priorità e ripetizione."
      busy={busy}
      onClose={onClose}
      className="max-w-lg"
    >
      <form onSubmit={save} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          Titolo
          <Input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5 text-sm">
            Scadenza
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block space-y-1.5 text-sm">
            Ora
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-sm">Priorità</p>
            <Select
              aria-label="Priorità"
              value={priority}
              options={priorities}
              showPlaceholder={false}
              onChange={(value) => {
                const option = priorities.find((p) => p.value === value);
                if (option) setPriority(option.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm">Ripetizione</p>
            <Select
              aria-label="Ripetizione"
              value={recurrence}
              options={recurrences}
              placeholder="Nessuna"
              onChange={(value) => {
                const option = recurrences.find((p) => p.value === value);
                if (option) setRecurrence(option.value);
              }}
            />
          </div>
        </div>
        <label className="block space-y-1.5 text-sm">
          Note
          <textarea
            className="wm-field w-full py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-wm-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {reminder && (
            <Button variant="destructive" onClick={() => setConfirming(true)} disabled={busy}>
              Elimina
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Annulla
          </Button>
          <Button type="submit" disabled={busy || !title.trim() || !date}>
            {busy ? "Salvataggio..." : reminder ? "Salva" : "Crea"}
          </Button>
        </div>
      </form>
      {reminder && (
        <ConfirmDeleteDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Eliminare il promemoria?"
          description="Il promemoria verrà eliminato definitivamente."
          onConfirm={async () => {
            await remove.mutateAsync(reminder.id);
            onClose();
          }}
        />
      )}
    </AppDialog>
  );
}
