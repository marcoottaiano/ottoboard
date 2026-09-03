"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  useCreateFinancialGoal,
  useFinancialGoals,
  useUpdateFinancialGoal,
  useDeleteFinancialGoal,
  useCompleteFinancialGoal,
} from "@/hooks/useFinancialGoals";
import { type FinancialGoal } from "@/types";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { AppDialog } from "@/components/ui/AppDialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#f97316", "#ec4899"];
export function GoalEditor({ goal, onClose }: { goal?: FinancialGoal; onClose: () => void }) {
  const goals = useFinancialGoals();
  const create = useCreateFinancialGoal();
  const update = useUpdateFinancialGoal();
  const remove = useDeleteFinancialGoal();
  const complete = useCompleteFinancialGoal();
  const [name, setName] = useState(goal?.name ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const busy = create.isPending || update.isPending || remove.isPending || complete.isPending;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const amount = Number(target);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Inserisci un nome e un importo maggiore di zero.");
      return;
    }
    submitting.current = true;
    setError(null);
    const fields = {
      name: name.trim(),
      icon: icon.trim() || null,
      target_amount: amount,
      deadline: deadline || null,
      color,
    };
    try {
      if (goal) await update.mutateAsync({ id: goal.id, ...fields });
      else await create.mutateAsync({ ...fields, current_amount: 0, position: goals.data?.length ?? 0 });
      onClose();
    } catch {
      setError("Salvataggio non riuscito. I dati inseriti sono stati conservati.");
    } finally {
      submitting.current = false;
    }
  }
  async function toggleComplete() {
    if (!goal || submitting.current) return;
    submitting.current = true;
    setError(null);
    try {
      await complete.mutateAsync({ id: goal.id, completed: !goal.completed });
      onClose();
    } catch {
      setError("Impossibile aggiornare l’obiettivo. Riprova.");
    } finally {
      submitting.current = false;
    }
  }
  return (
    <AppDialog
      title={goal ? "Modifica obiettivo" : "Nuovo obiettivo"}
      description="Definisci un traguardo per i tuoi risparmi."
      busy={busy}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={save}>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <label className="space-y-2 text-sm">
            Icona
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} placeholder="Simbolo" />
          </label>
          <label className="space-y-2 text-sm">
            Nome
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <label className="block space-y-2 text-sm">
          Importo obiettivo (€)
          <Input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label className="block space-y-2 text-sm">
          Scadenza opzionale
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm">Colore</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((value) => (
              <Button
                key={value}
                variant="ghost"
                size="icon-sm"
                aria-label={`Colore ${value}`}
                aria-pressed={color === value}
                onClick={() => setColor(value)}
                className="rounded-full border-2"
                style={{
                  backgroundColor: value,
                  borderColor: color === value ? "var(--wm-foreground)" : "transparent",
                }}
              />
            ))}
          </div>
        </fieldset>
        {goal && (
          <Button variant="outline" className="w-full" disabled={busy} onClick={toggleComplete}>
            {goal.completed ? "Riapri obiettivo" : "Segna come completato"}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-wm-destructive">
            {error}
          </p>
        )}
        {goals.isError && !goal && (
          <p role="alert" className="text-sm text-wm-destructive">
            Impossibile caricare gli obiettivi. Chiudi e riprova.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-wm-border pt-4">
          {goal && (
            <Button
              variant="ghost"
              className="mr-auto text-wm-destructive"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Elimina
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={busy || (!goal && (goals.isLoading || goals.isError))}>
            {busy ? "Salvataggio..." : "Salva obiettivo"}
          </Button>
        </div>
      </form>
      {goal && (
        <ConfirmDeleteDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Elimina obiettivo"
          description="L’obiettivo verrà eliminato definitivamente."
          onConfirm={async () => {
            await remove.mutateAsync(goal.id);
            onClose();
          }}
        />
      )}
    </AppDialog>
  );
}
