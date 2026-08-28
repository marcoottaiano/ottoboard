"use client";

import { useCategories } from "@/hooks/useCategories";
import { useDeleteTransaction, useUpdateTransaction } from "@/hooks/useFinanceMutations";
import { Select, SelectOption } from "@/components/ui/Select";
import { TransactionWithCategory, TransactionType } from "@/types";
import { Lock, LockOpen, Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  transaction: TransactionWithCategory;
  onClose: () => void;
}

export function TransactionEditModal({ transaction, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { data: categories } = useCategories();
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [description, setDescription] = useState(transaction.description ?? "");
  const [date, setDate] = useState(transaction.date);
  const [categoryLocked, setCategoryLocked] = useState(transaction.category_locked ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = updateTx.isPending || deleteTx.isPending;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        queueMicrotask(() => {
          if (!event.defaultPrevented && !updateTx.isPending && !deleteTx.isPending) onClose();
        });
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [deleteTx.isPending, onClose, updateTx.isPending]);

  const filteredCategories = categories?.filter((c) => c.type === type || c.type === "both") ?? [];
  const categoryOptions: SelectOption[] = filteredCategories.map((c) => ({
    value: c.id,
    label: `${c.icon ?? ""} ${c.name}`,
  }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Importo non valido");
      return;
    }
    try {
      await updateTx.mutateAsync({ id: transaction.id, amount: amountNum, type, category_id: categoryId, description: description || undefined, date, category_locked: categoryLocked });
      onClose();
    } catch {
      setError("Errore durante il salvataggio");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTx.mutateAsync(transaction.id);
      onClose();
    } catch {
      setError("Errore durante l'eliminazione");
    }
  };

  const requestClose = () => {
    if (!isBusy) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && requestClose()} role="dialog" aria-modal="true" aria-labelledby="transaction-edit-title">
      <div ref={dialogRef} className="ob-panel max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <p className="ob-eyebrow">Movimento registrato</p>
            <h2 id="transaction-edit-title" className="mt-2 text-lg font-semibold">
              Modifica transazione
            </h2>
          </div>
          <button type="button" onClick={requestClose} disabled={isBusy} className="ob-icon-button size-8 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Chiudi">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <label htmlFor="edit-transaction-amount" className="ob-metric-label mb-2 block">
              Importo
            </label>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-[rgba(101,214,166,0.55)]">
              <input id="edit-transaction-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="transaction-amount-input min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-base tabular-nums text-white focus:outline-none" />
              <span className={`flex-shrink-0 text-sm font-semibold ${type === "income" ? "text-emerald-400" : "text-red-400"}`}>€</span>
            </div>
          </div>

          <fieldset className="sm:col-span-5">
            <legend className="ob-metric-label mb-2 block">Tipo</legend>
            <div className="flex min-h-11 overflow-hidden rounded-lg border border-white/[0.08]">
              <button type="button" onClick={() => setType("expense")} className={`flex-1 px-4 text-xs font-semibold transition-colors ${type === "expense" ? "bg-red-500/20 text-red-400" : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"}`}>
                Uscita
              </button>
              <div className="w-px bg-white/[0.08]" />
              <button type="button" onClick={() => setType("income")} className={`flex-1 px-4 text-xs font-semibold transition-colors ${type === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"}`}>
                Entrata
              </button>
            </div>
          </fieldset>

          <div className="sm:col-span-7">
            <span className="ob-metric-label mb-2 block">Categoria</span>
            <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} placeholder="Seleziona..." className="w-full" />
          </div>

          <div className="sm:col-span-5">
            <label htmlFor="edit-transaction-date" className="ob-metric-label mb-2 block">
              Data
            </label>
            <input id="edit-transaction-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ob-field min-h-11 w-full" />
          </div>

          <button type="button" onClick={() => setCategoryLocked((v) => !v)} aria-pressed={categoryLocked} className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-xs transition-colors sm:col-span-12 ${categoryLocked ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/[0.035] border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80"}`}>
            {categoryLocked ? <Lock size={14} /> : <LockOpen size={14} />}
            <span>{categoryLocked ? "Categoria bloccata (esclusa da operazioni bulk)" : "Blocca categoria"}</span>
          </button>

          <div className="sm:col-span-12">
            <label htmlFor="edit-transaction-description" className="ob-metric-label mb-2 block">
              Descrizione <span className="normal-case tracking-normal text-white/25">(opzionale)</span>
            </label>
            <input id="edit-transaction-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Cena, abbonamento, rimborso..." className="ob-field min-h-11 w-full placeholder-white/20" />
          </div>

          {error && <p className="text-xs text-red-400 sm:col-span-12">{error}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-5 sm:col-span-12 sm:flex-row sm:items-center sm:justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={isBusy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50">
                  <Trash2 size={14} />
                  {deleteTx.isPending ? "Eliminazione..." : "Conferma eliminazione"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={isBusy} className="ob-secondary-action min-h-10 px-4">
                  Annulla
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={isBusy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
                <Trash2 size={14} />
                Elimina
              </button>
            )}

            <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-6 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50 sm:min-w-40">
              <Save size={15} />
              {updateTx.isPending ? "Salvo..." : "Salva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
