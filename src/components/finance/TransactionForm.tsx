"use client";

import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useFinanceMutations";
import { Select, SelectOption } from "@/components/ui/Select";
import { TransactionType } from "@/types";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface TransactionFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
  onPendingChange?: (isPending: boolean) => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({ embedded = false, onSuccess, onPendingChange }: TransactionFormProps) {
  const { data: categories } = useCategories();
  const createTx = useCreateTransaction();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO);
  const [errors, setErrors] = useState<{ amount?: string; category?: string; date?: string; submit?: string }>({});

  useEffect(() => {
    onPendingChange?.(createTx.isPending);
  }, [createTx.isPending, onPendingChange]);

  const filteredCategories = categories?.filter((c) => c.type === type || c.type === "both") ?? [];

  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ""} ${c.name}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { amount?: string; category?: string; date?: string } = {};
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) newErrors.amount = "Importo non valido";
    if (!categoryId) newErrors.category = "Seleziona una categoria";
    if (!date) newErrors.date = "Data obbligatoria";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    try {
      await createTx.mutateAsync({ amount: amountNum, type, category_id: categoryId, description: description || undefined, date });
      setAmount("");
      setDescription("");
      setDate(todayISO());
      onSuccess?.();
    } catch {
      setErrors({ submit: "Errore durante il salvataggio. Riprova." });
    }
  };

  const accentColor = type === "income" ? "emerald" : "red";

  return (
    <div className={embedded ? "" : "finance-card p-5"}>
      {!embedded && <h3 className="ob-card-title mb-4">Aggiungi transazione</h3>}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <label htmlFor="transaction-amount" className="ob-metric-label mb-2 block">
            Importo
          </label>
          <div className={`flex min-h-11 items-center gap-3 rounded-lg border bg-white/[0.035] px-3 transition-colors focus-within:ring-2 focus-within:ring-[rgba(101,214,166,0.55)] ${errors.amount ? "border-red-500/40" : "border-white/[0.08] focus-within:border-transparent"}`}>
            <input
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
              className="transaction-amount-input min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-base tabular-nums text-white placeholder-white/20 focus:outline-none"
            />
            <span className={`flex-shrink-0 text-sm font-semibold ${accentColor === "emerald" ? "text-emerald-400" : "text-red-400"}`}>€</span>
          </div>
          {errors.amount && <p className="mt-1.5 pl-1 text-xs text-red-400">{errors.amount}</p>}
        </div>

        <fieldset className="sm:col-span-5">
          <legend className="ob-metric-label mb-2 block">Tipo</legend>
          <div className="flex min-h-11 overflow-hidden rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
                setErrors((prev) => ({ ...prev, category: undefined, submit: undefined }));
              }}
              className={`flex-1 px-4 text-xs font-semibold transition-colors ${type === "expense" ? "bg-red-500/20 text-red-400" : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"}`}
            >
              Uscita
            </button>
            <div className="w-px bg-white/[0.08]" />
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
                setErrors((prev) => ({ ...prev, category: undefined, submit: undefined }));
              }}
              className={`flex-1 px-4 text-xs font-semibold transition-colors ${type === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"}`}
            >
              Entrata
            </button>
          </div>
        </fieldset>

        <div className="sm:col-span-7">
          <span className="ob-metric-label mb-2 block">Categoria</span>
          <Select
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setErrors((prev) => ({ ...prev, category: undefined }));
            }}
            options={categoryOptions}
            placeholder="Categoria..."
            className={`w-full ${errors.category ? "border-red-500/40" : ""}`}
          />
          {errors.category && <p className="mt-1.5 pl-1 text-xs text-red-400">{errors.category}</p>}
        </div>

        <div className="sm:col-span-5">
          <label htmlFor="transaction-date" className="ob-metric-label mb-2 block">
            Data
          </label>
          <input
            id="transaction-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: undefined, submit: undefined }));
            }}
            className={`ob-field min-h-11 w-full ${errors.date ? "border-red-500/40" : ""}`}
          />
          {errors.date && <p className="mt-1.5 pl-1 text-xs text-red-400">{errors.date}</p>}
        </div>

        <div className="sm:col-span-12">
          <label htmlFor="transaction-description" className="ob-metric-label mb-2 block">
            Descrizione <span className="normal-case tracking-normal text-white/25">(opzionale)</span>
          </label>
          <input id="transaction-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Cena, abbonamento, rimborso..." className="ob-field min-h-11 w-full placeholder-white/20" />
        </div>

        <button type="submit" disabled={createTx.isPending} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 sm:col-span-12 ${accentColor === "emerald" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30" : "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"}`}>
          <PlusCircle size={15} />
          {createTx.isPending ? "Salvataggio…" : "Aggiungi transazione"}
        </button>

        {errors.submit && <p className="text-center text-xs text-red-400 sm:col-span-12">{errors.submit}</p>}
      </form>
    </div>
  );
}
