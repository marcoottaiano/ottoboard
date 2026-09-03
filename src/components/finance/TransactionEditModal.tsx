"use client";
import { useRef, useState, type FormEvent } from "react";
import { useCategories } from "@/hooks/useCategories";
import { useDeleteTransaction, useUpdateTransaction } from "@/hooks/useFinanceMutations";
import { type TransactionWithCategory, type TransactionType } from "@/types";
import { Save, Trash2 } from "lucide-react";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Switch } from "@/components/watermelon-ui/switch";
import { Select } from "@/components/ui/Select";
import { AppDialog } from "@/components/ui/AppDialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
export function TransactionEditModal({
  transaction,
  onClose,
}: {
  transaction: TransactionWithCategory;
  onClose: () => void;
}) {
  const categories = useCategories();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const submitting = useRef(false);
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [date, setDate] = useState(transaction.date);
  const [locked, setLocked] = useState(transaction.category_locked ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = update.isPending || remove.isPending;
  const options = (categories.data ?? [])
    .filter((category) => category.type === type || category.type === "both")
    .map((category) => ({ value: category.id, label: `${category.icon ?? ""} ${category.name}` }));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Importo non valido");
      return;
    }
    if (!date || !options.some((option) => option.value === categoryId)) {
      setError("Seleziona una data e una categoria valida.");
      return;
    }
    submitting.current = true;
    setError(null);
    try {
      await update.mutateAsync({
        id: transaction.id,
        amount: value,
        type,
        category_id: categoryId,
        description: description || undefined,
        date,
        category_locked: locked,
      });
      onClose();
    } catch {
      setError("Errore durante il salvataggio. Riprova.");
    } finally {
      submitting.current = false;
    }
  }
  function changeType(next: TransactionType) {
    setType(next);
    if (!(categories.data ?? []).some((c) => c.id === categoryId && (c.type === next || c.type === "both")))
      setCategoryId("");
  }
  return (
    <AppDialog
      title="Modifica transazione"
      description="Aggiorna i dettagli del movimento registrato."
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          Importo
          <Input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm">Tipo</legend>
          <div className="flex gap-2">
            <Button
              variant={type === "expense" ? "secondary" : "outline"}
              aria-pressed={type === "expense"}
              onClick={() => changeType("expense")}
            >
              Uscita
            </Button>
            <Button
              variant={type === "income" ? "secondary" : "outline"}
              aria-pressed={type === "income"}
              onClick={() => changeType("income")}
            >
              Entrata
            </Button>
          </div>
        </fieldset>
        <div className="space-y-2">
          <p className="text-sm">Categoria</p>
          <Select
            aria-label="Categoria"
            value={categoryId}
            onChange={setCategoryId}
            options={options}
            disabled={categories.isLoading || categories.isError}
          />
        </div>
        <label className="space-y-2 text-sm">
          Data
          <Input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <Switch checked={locked} onCheckedChange={setLocked} />
          Blocca categoria nelle operazioni multiple
        </label>
        <label className="space-y-2 text-sm sm:col-span-2">
          Descrizione
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrizione opzionale"
          />
        </label>
        {categories.isError && (
          <p role="alert" className="text-sm text-wm-destructive sm:col-span-2">
            Impossibile caricare le categorie.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-wm-destructive sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-wm-border pt-4 sm:col-span-2">
          <Button
            variant="ghost"
            className="text-wm-destructive"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
            Elimina
          </Button>
          <Button type="submit" disabled={busy || categories.isError || categories.isLoading}>
            <Save />
            {update.isPending ? "Salvo..." : "Salva"}
          </Button>
        </div>
      </form>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Elimina transazione"
        description="Il movimento verrà eliminato definitivamente."
        onConfirm={async () => {
          await remove.mutateAsync(transaction.id);
          onClose();
        }}
      />
    </AppDialog>
  );
}
