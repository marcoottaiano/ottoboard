"use client";

import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Card } from "@/components/watermelon-ui/card";

import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";
import { Switch } from "@/components/watermelon-ui/switch";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { Select, SelectOption } from "@/components/ui/Select";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreateRecurring,
  useDeleteRecurring,
  useRecurringTransactions,
  useToggleRecurring,
  useUpdateRecurring,
} from "@/hooks/useRecurringTransactions";
import { RecurringFrequency, RecurringTransaction, TransactionType } from "@/types";
import { ChevronDown, Pencil, PlusCircle, RefreshCw, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Settimanale",
  monthly: "Mensile",
  yearly: "Annuale",
};

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "monthly", label: "Mensile" },
  { value: "weekly", label: "Settimanale" },
  { value: "yearly", label: "Annuale" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Inline Form ──────────────────────────────────────────────────────────────

interface FormState {
  type: TransactionType;
  amount: string;
  categoryId: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
}

function emptyForm(): FormState {
  return { type: "expense", amount: "", categoryId: "", description: "", frequency: "monthly", startDate: todayISO() };
}

function fromRecurring(r: RecurringTransaction): FormState {
  return {
    type: r.type,
    amount: String(r.amount),
    categoryId: r.category_id,
    description: r.description ?? "",
    frequency: r.frequency,
    startDate: r.next_due_date,
  };
}

interface RecurringFormProps {
  initial?: RecurringTransaction;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

function RecurringForm({ initial, onSave, onCancel, isPending }: RecurringFormProps) {
  const { data: categories } = useCategories();
  const [form, setForm] = useState<FormState>(initial ? fromRecurring(initial) : emptyForm());
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const filteredCategories = categories?.filter((c) => c.type === form.type || c.type === "both") ?? [];

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ""} ${c.name}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || isPending) return;
    setError(null);
    const amountNum = parseFloat(form.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Importo non valido");
      return;
    }
    if (!categoryOptions.some((option) => option.value === form.categoryId) || !form.startDate) {
      setError("Seleziona una categoria");
      return;
    }
    submitting.current = true;
    try {
      await onSave(form);
    } catch {
      setError("Errore durante il salvataggio");
    } finally {
      submitting.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-xl bg-wm-muted border border-wm-border space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        {/* Tipo */}
        <div className="flex rounded-lg overflow-hidden border border-wm-border flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              set("type", "expense");
              set("categoryId", "");
            }}
            className={`px-3 py-2 text-xs font-medium transition-colors ${form.type === "expense" ? "bg-wm-destructive/20 text-wm-destructive" : "text-wm-muted-foreground hover:text-wm-muted-foreground"}`}
          >
            Uscita
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              set("type", "income");
              set("categoryId", "");
            }}
            className={`px-3 py-2 text-xs font-medium transition-colors ${form.type === "income" ? "bg-wm-success/20 text-wm-primary" : "text-wm-muted-foreground hover:text-wm-muted-foreground"}`}
          >
            Entrata
          </Button>
        </div>

        {/* Importo */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
            className="w-24 bg-wm-muted border border-wm-border rounded-lg px-2 py-2 text-sm text-wm-foreground focus:outline-hidden focus:border-wm-border"
          />
          <span className={`text-sm font-medium ${form.type === "income" ? "text-wm-primary" : "text-wm-destructive"}`}>
            €
          </span>
        </div>

        {/* Categoria */}
        <Select
          value={form.categoryId}
          onChange={(v) => set("categoryId", v)}
          options={categoryOptions}
          placeholder="Categoria..."
          className="min-w-[160px]"
        />

        {/* Frequenza */}
        <Select
          value={form.frequency}
          onChange={(v) => {
            if (v === "weekly" || v === "monthly" || v === "yearly") set("frequency", v);
          }}
          showPlaceholder={false}
          options={FREQUENCY_OPTIONS}
          className="min-w-[130px]"
        />

        {/* Prima scadenza */}
        <Input
          type="date"
          value={form.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          className="bg-wm-muted border border-wm-border rounded-lg px-2 py-2 text-sm text-wm-muted-foreground focus:outline-hidden focus:border-wm-border"
        />

        {/* Descrizione */}
        <Input
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Descrizione (opzionale)"
          className="flex-1 min-w-[140px] bg-wm-muted border border-wm-border rounded-lg px-2 py-2 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-border"
        />

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="default"
            size="sm"
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? "Salvo..." : "Salva"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={isPending}
            aria-label="Annulla modifica"
            onClick={onCancel}
            className="p-2 rounded-lg text-wm-muted-foreground hover:text-wm-muted-foreground hover:bg-wm-muted transition-colors"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-wm-destructive">{error}</p>}
    </form>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function RecurringRow({ item, onEdit }: { item: RecurringTransaction; onEdit: (item: RecurringTransaction) => void }) {
  const toggle = useToggleRecurring();
  const deleteR = useDeleteRecurring();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const amountColor = item.type === "income" ? "text-wm-primary" : "text-wm-destructive";
  const amountSign = item.type === "income" ? "+" : "-";

  return (
    <div
      className={`grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-3 rounded-lg border border-wm-border sm:flex sm:flex-wrap sm:border-0 transition-opacity ${!item.is_active ? "opacity-50" : ""}`}
    >
      {/* Category icon */}
      <span className="text-base w-6 text-center flex-shrink-0">{item.category?.icon ?? "💳"}</span>

      {/* Description + category */}
      <div className="flex-1 min-w-0">
        <p className="break-words text-sm text-wm-foreground sm:truncate">
          {item.description || item.category?.name || "—"}
        </p>
        <p className="break-words text-xs text-wm-muted-foreground sm:truncate">{item.category?.name}</p>
        <p className="mt-1 text-xs text-wm-muted-foreground sm:hidden">
          {FREQUENCY_LABELS[item.frequency]} · Prossima: {formatDate(item.next_due_date)}
        </p>
      </div>

      {/* Frequency badge */}
      <span className="text-xs px-2 py-0.5 rounded-full bg-wm-muted text-wm-muted-foreground flex-shrink-0 hidden sm:inline">
        {FREQUENCY_LABELS[item.frequency]}
      </span>

      {/* Next due */}
      <span className="text-xs text-wm-muted-foreground flex-shrink-0 hidden md:inline">
        {formatDate(item.next_due_date)}
      </span>

      {/* Amount */}
      <span className={`col-start-2 text-sm font-medium tabular-nums flex-shrink-0 ${amountColor}`}>
        {amountSign}
        <PrivacyValue>{item.amount.toFixed(2)} €</PrivacyValue>
      </span>

      <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-wm-border pt-2 sm:border-0 sm:pt-0">
        {/* Toggle */}
        <label className="mr-auto flex min-h-11 items-center gap-2 text-xs text-wm-muted-foreground sm:mr-0">
          <span className="sm:sr-only">{item.is_active ? "Attiva" : "In pausa"}</span>
          <Switch
            checked={item.is_active}
            onCheckedChange={(checked) => toggle.mutate({ id: item.id, is_active: checked })}
            disabled={toggle.isPending}
            aria-label={item.is_active ? "Disattiva ricorrenza" : "Attiva ricorrenza"}
          />
        </label>
        {/* Edit */}
        <Button
          variant="ghost"
          size="sm"
          aria-label="Modifica ricorrenza"
          onClick={() => onEdit(item)}
          className="size-11 p-1.5 rounded-lg text-wm-muted-foreground hover:text-wm-muted-foreground hover:bg-wm-muted transition-colors"
        >
          <Pencil size={13} />
        </Button>

        {/* Delete */}
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11"
            onClick={() => setConfirmDelete(true)}
            aria-label="Elimina ricorrenza"
          >
            <Trash2 size={13} />
          </Button>
          <ConfirmDeleteDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Elimina ricorrenza"
            description="Le transazioni già registrate resteranno disponibili."
            onConfirm={() => deleteR.mutateAsync(item.id)}
          />
        </>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RecurringTransactionManager() {
  const { data: items = [], isLoading, isError, refetch } = useRecurringTransactions();
  const createR = useCreateRecurring();
  const updateR = useUpdateRecurring();

  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

  const handleCreate = async (form: FormState) => {
    await createR.mutateAsync({
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.categoryId,
      description: form.description || null,
      frequency: form.frequency,
      next_due_date: form.startDate,
    });
    setShowAddForm(false);
  };

  const handleUpdate = async (form: FormState) => {
    if (!editingItem) return;
    await updateR.mutateAsync({
      id: editingItem.id,
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.categoryId,
      description: form.description || null,
      frequency: form.frequency,
      next_due_date: form.startDate,
    });
    setEditingItem(null);
  };

  if (isError) return <DataError onRetry={() => void refetch()} message="Impossibile caricare le ricorrenze." />;
  const activeCount = items.filter((i) => i.is_active).length;

  return (
    <Card className="wm-card">
      {/* Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="h-auto min-h-14 w-full flex items-center justify-between gap-3 whitespace-normal px-4 py-4 text-left hover:bg-wm-muted transition-colors"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <RefreshCw size={15} className="text-wm-primary" />
          <span className="text-sm font-semibold sm:text-base">Transazioni ricorrenti</span>
          {activeCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-wm-success/15 text-wm-primary">
              {activeCount} attive
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-wm-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open && (
        <div className="border-t border-wm-border px-4 pb-4 pt-3 space-y-1">
          {isLoading ? (
            <div className="h-8 bg-wm-muted rounded animate-pulse" />
          ) : items.length === 0 && !showAddForm ? (
            <p className="text-sm text-wm-muted-foreground py-2 text-center">
              Nessuna transazione ricorrente. Aggiungine una!
            </p>
          ) : (
            items.map((item) =>
              editingItem?.id === item.id ? (
                <RecurringForm
                  key={item.id}
                  initial={editingItem}
                  onSave={handleUpdate}
                  onCancel={() => setEditingItem(null)}
                  isPending={updateR.isPending}
                />
              ) : (
                <RecurringRow key={item.id} item={item} onEdit={setEditingItem} />
              ),
            )
          )}

          {showAddForm ? (
            <RecurringForm onSave={handleCreate} onCancel={() => setShowAddForm(false)} isPending={createR.isPending} />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 mt-1 px-3 py-2 rounded-lg text-sm text-wm-muted-foreground hover:text-wm-foreground hover:bg-wm-muted transition-colors"
            >
              <PlusCircle size={14} />
              Aggiungi ricorrente
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
