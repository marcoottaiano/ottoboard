"use client";
import { useRef, useState } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useUpsertBudget, useDeleteBudget } from "@/hooks/useFinanceMutations";
import { Button } from "@/components/watermelon-ui/button";
import { Card } from "@/components/watermelon-ui/card";
import { Input } from "@/components/watermelon-ui/input";
import { Progress } from "@/components/watermelon-ui/progress";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { formatEur } from "@/lib/finance/presentation";
import { Select } from "@/components/ui/Select";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";
export function BudgetTracker({ month }: { month: string }) {
  const budgets = useBudgets(month);
  const transactions = useTransactions({ month, type: "expense" });
  const categories = useCategories();
  const save = useUpsertBudget();
  const remove = useDeleteBudget();
  const { isPrivate } = usePrivacyMode();
  const submitting = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [help, setHelp] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const assigned = new Set((budgets.data ?? []).map((b) => b.category_id));
  const options = (categories.data ?? [])
    .filter((c) => (c.type === "expense" || c.type === "both") && !assigned.has(c.id))
    .map((c) => ({ value: c.id, label: `${c.icon ?? ""} ${c.name}` }));
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions.data ?? [])
    spentByCategory.set(
      transaction.category_id,
      (spentByCategory.get(transaction.category_id) ?? 0) + transaction.amount,
    );
  async function saveBudget(id: string, rawAmount: string) {
    const amount = Number(rawAmount);
    if (submitting.current) return;
    if (!id || !Number.isFinite(amount) || amount <= 0) {
      setError("Seleziona una categoria e inserisci un importo maggiore di zero.");
      return;
    }
    submitting.current = true;
    setError(null);
    try {
      await save.mutateAsync({ category_id: id, amount, month });
      setEditingId(null);
      setAdding(false);
      setCategoryId("");
      setNewAmount("");
    } catch {
      setError("Salvataggio non riuscito. Riprova.");
    } finally {
      submitting.current = false;
    }
  }
  if (budgets.isError || transactions.isError || categories.isError)
    return (
      <DataError
        onRetry={() => {
          void budgets.refetch();
          void transactions.refetch();
          void categories.refetch();
        }}
        message="Impossibile caricare i budget."
      />
    );
  if (budgets.isLoading || transactions.isLoading || categories.isLoading) return <Skeleton className="h-64" />;
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="wm-card-title">Budget mensile</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Informazioni sui budget"
            aria-expanded={help}
            onClick={() => setHelp((value) => !value)}
          >
            <HelpCircle size={15} />
          </Button>
        </div>
        {options.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setAdding((value) => !value)} disabled={save.isPending}>
            <Plus size={14} />
            Aggiungi
          </Button>
        )}
      </div>
      {help && (
        <p className="mb-4 rounded-lg bg-wm-secondary p-3 text-xs text-wm-secondary-foreground">
          Imposta un limite per categoria. Verde: sotto l’80%; ambra: vicino al limite; rosso: budget esaurito.
          Seleziona il limite per modificarlo.
        </p>
      )}
      {adding && (
        <form
          className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-wm-muted p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveBudget(categoryId, newAmount);
          }}
        >
          <div className="min-w-40 flex-1">
            <Select aria-label="Categoria del budget" value={categoryId} onChange={setCategoryId} options={options} />
          </div>
          <Input
            aria-label="Importo del nuovo budget"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-28"
          />
          <Button type="submit" disabled={save.isPending || !categoryId}>
            Salva
          </Button>
          <Button variant="ghost" disabled={save.isPending} onClick={() => setAdding(false)}>
            Annulla
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-wm-destructive">
          {error}
        </p>
      )}
      {!budgets.data?.length ? (
        <p className="py-8 text-center text-sm text-wm-muted-foreground">Nessun budget impostato per questo mese.</p>
      ) : (
        <div className="space-y-5">
          {budgets.data.map((budget) => {
            const spent = spentByCategory.get(budget.category_id) ?? 0;
            const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            return (
              <div key={budget.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {budget.category?.icon} {budget.category?.name}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                    <PrivacyValue className="text-xs text-wm-muted-foreground">{formatEur(spent)} /</PrivacyValue>
                    {editingId === budget.category_id ? (
                      <form
                        className="flex flex-wrap gap-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveBudget(budget.category_id, editAmount);
                        }}
                      >
                        <Input
                          autoFocus
                          aria-label="Nuovo limite mensile"
                          className="h-8 w-24"
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          value={editAmount}
                          onChange={(event) => setEditAmount(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape" && !save.isPending) setEditingId(null);
                          }}
                        />
                        <Button size="sm" type="submit" disabled={save.isPending}>
                          Salva
                        </Button>
                        <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => setEditingId(null)}>
                          Annulla
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Modifica budget ${budget.category?.name ?? ""}`}
                        disabled={save.isPending}
                        onClick={() => {
                          setEditingId(budget.category_id);
                          setEditAmount(String(budget.amount));
                        }}
                      >
                        <PrivacyValue>{formatEur(budget.amount)}</PrivacyValue>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Elimina budget ${budget.category?.name ?? ""}`}
                      disabled={save.isPending || remove.isPending}
                      onClick={() => setDeletingId(budget.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                {!isPrivate && (
                  <Progress
                    aria-label={`Budget utilizzato: ${budget.category?.name ?? "categoria"}`}
                    value={percent}
                    indicatorClassName={
                      percent < 80 ? "bg-wm-primary" : percent < 100 ? "bg-wm-warning" : "bg-wm-destructive"
                    }
                  />
                )}
                {percent > 100 && (
                  <p className="mt-2 text-xs text-wm-destructive">
                    Sforato di <PrivacyValue>{formatEur(spent - budget.amount)}</PrivacyValue>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDeleteDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title="Elimina budget"
        description="Il limite mensile verrà rimosso. Le transazioni restano disponibili."
        onConfirm={async () => {
          if (deletingId) await remove.mutateAsync(deletingId);
        }}
      />
    </Card>
  );
}
