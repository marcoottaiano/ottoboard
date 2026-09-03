"use client";

import { DataError } from "@/components/ui/DataError";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Card } from "@/components/watermelon-ui/card";

import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useFinanceMutations";
import { Select, SelectOption } from "@/components/ui/Select";
import { TransactionType } from "@/types";
import { PlusCircle } from "lucide-react";
import { useRef, useState } from "react";

interface TransactionFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
  onPendingChange?: (isPending: boolean) => void;
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function TransactionForm({ embedded = false, onSuccess, onPendingChange }: TransactionFormProps) {
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError, refetch } = useCategories();
  const createTx = useCreateTransaction();
  const submitting = useRef(false);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO);
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string; submit?: string }>({});

  const filteredCategories = categories?.filter((c) => c.type === type || c.type === "both") ?? [];

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ""} ${c.name}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const newErrors: { amount?: string; category?: string; date?: string } = {};
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) newErrors.amount = "Importo non valido";
    if (!categoryOptions.some((option) => option.value === categoryId)) newErrors.category = "Seleziona una categoria";
    if (!date) newErrors.date = "Data obbligatoria";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    submitting.current = true;
    onPendingChange?.(true);
    try {
      await createTx.mutateAsync({
        amount: amountNum,
        type,
        category_id: categoryId,
        description: description || undefined,
        date,
      });
      setAmount("");
      setDescription("");
      setDate(todayISO());
      onSuccess?.();
    } catch {
      setErrors({ submit: "Errore durante il salvataggio. Riprova." });
    } finally {
      submitting.current = false;
      onPendingChange?.(false);
    }
  };

  const accentColor = type === "income" ? "emerald" : "red";

  return (
    <Card className={embedded ? "border-0 bg-transparent shadow-none" : "wm-card p-5"}>
      {!embedded && <h3 className="wm-card-title mb-4">Aggiungi transazione</h3>}
      {categoriesError && <DataError onRetry={() => void refetch()} message="Impossibile caricare le categorie." />}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <label htmlFor="transaction-amount" className="wm-metric-label mb-2 block">
            Importo
          </label>
          <div
            className={`flex min-h-11 items-center gap-3 rounded-lg border bg-wm-muted px-3 transition-colors focus-within:ring-2 focus-within:ring-wm-ring/50 ${errors.amount ? "border-wm-destructive/40" : "border-wm-border focus-within:border-transparent"}`}
          >
            <Input
              id="transaction-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0.00"
              className="transaction-amount-input min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-base tabular-nums text-wm-foreground placeholder-wm-muted-foreground focus:outline-hidden"
            />
            <span
              className={`flex-shrink-0 text-sm font-semibold ${accentColor === "emerald" ? "text-wm-primary" : "text-wm-destructive"}`}
            >
              €
            </span>
          </div>
          {errors.amount && <p className="mt-1.5 pl-1 text-xs text-wm-destructive">{errors.amount}</p>}
        </div>

        <fieldset className="sm:col-span-5">
          <legend className="wm-metric-label mb-2 block">Tipo</legend>
          <div className="flex min-h-11 overflow-hidden rounded-lg border border-wm-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
                setErrors((prev) => ({ ...prev, category: undefined, submit: undefined }));
              }}
              className={`h-auto min-h-11 flex-1 px-4 text-xs font-semibold transition-colors ${type === "expense" ? "bg-wm-destructive/20 text-wm-destructive" : "text-wm-muted-foreground hover:bg-wm-muted hover:text-wm-muted-foreground"}`}
            >
              Uscita
            </Button>
            <div className="w-px bg-wm-muted" />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
                setErrors((prev) => ({ ...prev, category: undefined, submit: undefined }));
              }}
              className={`flex-1 px-4 text-xs font-semibold transition-colors ${type === "income" ? "bg-wm-success/20 text-wm-primary" : "text-wm-muted-foreground hover:bg-wm-muted hover:text-wm-muted-foreground"}`}
            >
              Entrata
            </Button>
          </div>
        </fieldset>

        <div className="sm:col-span-7">
          <span className="wm-metric-label mb-2 block">Categoria</span>
          <Select
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setErrors((prev) => ({ ...prev, category: undefined }));
            }}
            disabled={categoriesLoading || categoriesError}
            options={categoryOptions}
            placeholder="Categoria..."
            className={`w-full ${errors.category ? "border-wm-destructive/40" : ""}`}
          />
          {errors.category && <p className="mt-1.5 pl-1 text-xs text-wm-destructive">{errors.category}</p>}
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="transaction-date" className="wm-metric-label mb-2 block">
            Data
          </label>
          <Input
            id="transaction-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: undefined, submit: undefined }));
            }}
            className={`wm-field min-h-11 w-full ${errors.date ? "border-wm-destructive/40" : ""}`}
          />
          {errors.date && <p className="mt-1.5 pl-1 text-xs text-wm-destructive">{errors.date}</p>}
        </div>

        <div className="sm:col-span-12">
          <label htmlFor="transaction-description" className="wm-metric-label mb-2 block">
            Descrizione <span className="normal-case tracking-normal text-wm-muted-foreground">(opzionale)</span>
          </label>
          <Input
            id="transaction-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Es. Cena, abbonamento, rimborso..."
            className="wm-field min-h-11 w-full placeholder-wm-muted-foreground"
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          type="submit"
          disabled={createTx.isPending || categoriesLoading || categoriesError}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 sm:col-span-12 ${accentColor === "emerald" ? "bg-wm-success/20 border border-wm-success/30 text-wm-primary hover:bg-wm-success/30" : "bg-wm-destructive/20 border border-wm-destructive/30 text-wm-destructive hover:bg-wm-destructive/30"}`}
        >
          <PlusCircle size={15} />
          {createTx.isPending ? "Salvataggio…" : "Aggiungi transazione"}
        </Button>

        {errors.submit && <p className="text-center text-xs text-wm-destructive sm:col-span-12">{errors.submit}</p>}
      </form>
    </Card>
  );
}
