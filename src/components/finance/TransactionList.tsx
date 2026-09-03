"use client";

import { useRef, useState } from "react";
import { Lock, Pencil, Search } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBulkDeleteTransactions, useBulkRecategorizeTransactions } from "@/hooks/useFinanceMutations";
import { type TransactionType, type TransactionWithCategory } from "@/types";
import { Button } from "@/components/watermelon-ui/button";
import { Card } from "@/components/watermelon-ui/card";
import { Input } from "@/components/watermelon-ui/input";
import { Checkbox } from "@/components/watermelon-ui/checkbox";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/watermelon-ui/table";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { formatEur } from "@/lib/finance/presentation";
import { Select } from "@/components/ui/Select";
import { TransactionEditModal } from "./TransactionEditModal";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";

const PAGE_SIZE = 20;
type TypeFilter = TransactionType | "all";
const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Tutte" },
  { value: "income", label: "Entrate" },
  { value: "expense", label: "Uscite" },
];
function dateLabel(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}
function CategoryLabel({ transaction, wrap = false }: { transaction: TransactionWithCategory; wrap?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-wm-muted px-2 py-1 text-xs text-wm-foreground">
      <span className={wrap ? "break-words whitespace-normal" : "truncate"}>
        {transaction.category?.icon} {transaction.category?.name ?? "Senza categoria"}
      </span>
      {transaction.category_locked && (
        <Lock size={12} className="shrink-0 text-wm-warning" aria-label="Categoria bloccata" />
      )}
    </span>
  );
}
function Amount({ transaction }: { transaction: TransactionWithCategory }) {
  return (
    <PrivacyValue
      className={`whitespace-nowrap font-mono text-sm font-medium ${transaction.type === "income" ? "text-wm-primary" : "text-wm-destructive"}`}
    >
      {transaction.type === "income" ? "+" : "−"}
      {formatEur(transaction.amount)}
    </PrivacyValue>
  );
}
export function TransactionList({ month }: { month: string }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<TransactionWithCategory | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changingCategory, setChangingCategory] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recategorizing = useRef(false);
  const transactions = useTransactions({ month, type: typeFilter === "all" ? undefined : typeFilter });
  const categories = useCategories();
  const remove = useBulkDeleteTransactions();
  const recategorize = useBulkRecategorizeTransactions();
  const filtered = (transactions.data ?? []).filter(
    (t) => !search || t.description?.toLocaleLowerCase("it-IT").includes(search.toLocaleLowerCase("it-IT")),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selection = (transactions.data ?? []).filter((t) => selectedIds.has(t.id));
  const allPageSelected = rows.length > 0 && rows.every((t) => selectedIds.has(t.id));
  const somePageSelected = rows.some((t) => selectedIds.has(t.id));
  const unlocked = selection.filter((t) => !t.category_locked);
  const categoryOptions = (categories.data ?? [])
    .filter((c) => unlocked.every((t) => c.type === t.type || c.type === "both"))
    .map((c) => ({ value: c.id, label: `${c.icon ?? ""} ${c.name}` }));
  const busy = remove.isPending || recategorize.isPending;
  function resetSelection() {
    setMultiSelect(false);
    setSelectedIds(new Set());
    setConfirmDelete(false);
    setChangingCategory(false);
    setCategoryId("");
    setError(null);
  }
  function toggleId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    if (next.size === 0) resetSelection();
  }
  function togglePage() {
    const next = new Set(selectedIds);
    for (const row of rows) {
      if (allPageSelected) next.delete(row.id);
      else next.add(row.id);
    }
    setSelectedIds(next);
    if (next.size === 0) resetSelection();
  }
  async function changeCategory() {
    if (recategorizing.current || !unlocked.length || !categoryOptions.some((c) => c.value === categoryId)) return;
    recategorizing.current = true;
    setError(null);
    try {
      await recategorize.mutateAsync({ ids: selection.map((t) => t.id), categoryId });
      resetSelection();
    } catch {
      setError("Ricategorizzazione non riuscita. Riprova.");
    } finally {
      recategorizing.current = false;
    }
  }
  return (
    <Card className="min-w-0 p-3 sm:p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="wm-card-title">Transazioni</h2>
          <p className="mt-1 text-xs text-wm-muted-foreground">{filtered.length} movimenti nel periodo</p>
        </div>
        <Button
          variant="outline"
          size="auto"
          disabled={busy}
          onClick={() => (multiSelect ? resetSelection() : setMultiSelect(true))}
        >
          {multiSelect ? "Annulla selezione" : "Seleziona"}
        </Button>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-wm-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <Input
            aria-label="Cerca nella descrizione delle transazioni"
            placeholder="Cerca un movimento..."
            value={search}
            disabled={busy}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
              resetSelection();
            }}
            className="h-11 pl-10"
          />
        </div>
        <div
          role="group"
          aria-label="Filtra per tipo"
          className="grid grid-cols-3 gap-1 rounded-lg bg-wm-muted p-1 sm:shrink-0"
        >
          {TYPE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant="ghost"
              size="auto"
              disabled={busy}
              aria-pressed={typeFilter === value}
              className={
                typeFilter === value
                  ? "bg-wm-card text-wm-primary shadow-xs ring-1 ring-wm-border"
                  : "text-wm-muted-foreground"
              }
              onClick={() => {
                setTypeFilter(value);
                setPage(0);
                resetSelection();
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {multiSelect && selection.length > 0 && (
        <div className="mb-4 rounded-lg border border-wm-border bg-wm-secondary p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-medium">{selection.length} selezionate</p>
            <Button
              variant="outline"
              size="auto"
              className="w-full sm:w-auto"
              disabled={busy || !unlocked.length}
              onClick={() => {
                setChangingCategory((value) => !value);
                setCategoryId("");
              }}
            >
              Cambia categoria
            </Button>
            <Button
              variant="destructive"
              size="auto"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              Elimina selezionati
            </Button>
          </div>
          {changingCategory && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-wm-muted-foreground">
                Le categorie bloccate sono escluse. Per tipi misti sono disponibili solo categorie compatibili con
                entrambi.
              </p>
              <div className="flex flex-wrap gap-2">
                <Select
                  aria-label="Nuova categoria"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryOptions}
                  disabled={busy || categories.isError}
                  className="min-h-11 min-w-0 w-full sm:min-w-40 sm:flex-1"
                />
                <Button
                  size="auto"
                  className="w-full sm:w-auto"
                  disabled={busy || !categoryId || !unlocked.length || categories.isError}
                  onClick={changeCategory}
                >
                  {recategorize.isPending ? "Aggiornamento..." : "Conferma categoria"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-wm-destructive">
          {error}
        </p>
      )}
      {categories.isError && changingCategory && (
        <DataError onRetry={() => void categories.refetch()} message="Impossibile caricare le categorie." />
      )}
      {transactions.isError ? (
        <DataError onRetry={() => void transactions.refetch()} />
      ) : transactions.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-12" />
          ))}
        </div>
      ) : !rows.length ? (
        <p className="py-12 text-center text-sm text-wm-muted-foreground">Nessuna transazione trovata.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {multiSelect && (
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Seleziona la pagina"
                        checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                        onCheckedChange={togglePage}
                        disabled={busy}
                      />
                    </TableHead>
                  )}
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>
                    <span className="sr-only">Azioni</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} data-state={selectedIds.has(t.id) ? "selected" : undefined}>
                    {multiSelect && (
                      <TableCell>
                        <Checkbox
                          aria-label={`Seleziona ${t.description || t.category?.name || "movimento"} del ${dateLabel(t.date)}`}
                          checked={selectedIds.has(t.id)}
                          onCheckedChange={() => toggleId(t.id)}
                          disabled={busy}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-xs text-wm-muted-foreground">{dateLabel(t.date)}</TableCell>
                    <TableCell>
                      <CategoryLabel transaction={t} />
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm">{t.description || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Amount transaction={t} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label={`Modifica ${t.description || "transazione"} del ${dateLabel(t.date)}`}
                        onClick={() => setSelected(t)}
                      >
                        <Pencil size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-2 md:hidden">
            {multiSelect && (
              <label className="mb-3 flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                  onCheckedChange={togglePage}
                  disabled={busy}
                />
                Seleziona questa pagina
              </label>
            )}
            {rows.map((t) => (
              <div
                key={t.id}
                className={`flex min-w-0 items-center rounded-xl border ${selectedIds.has(t.id) ? "border-wm-primary bg-wm-primary/5" : "border-wm-border"}`}
              >
                {multiSelect && (
                  <label className="flex min-h-11 min-w-11 items-center justify-center self-stretch">
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleId(t.id)}
                      disabled={busy}
                      aria-label={`Seleziona ${t.description || t.category?.name || "movimento"} del ${dateLabel(t.date)}`}
                    />
                  </label>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (multiSelect ? toggleId(t.id) : setSelected(t))}
                  aria-pressed={multiSelect ? selectedIds.has(t.id) : undefined}
                  className="block min-h-11 min-w-0 flex-1 space-y-2.5 rounded-xl p-3 text-left transition-colors hover:bg-wm-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-ring disabled:opacity-50"
                >
                  <span className="flex items-center justify-between gap-2 text-xs text-wm-muted-foreground">
                    <time dateTime={t.date}>{dateLabel(t.date)}</time>
                    {!multiSelect && (
                      <span className="inline-flex items-center gap-1">
                        <Pencil size={12} aria-hidden="true" />
                        Modifica
                      </span>
                    )}
                    {multiSelect && <span>{selectedIds.has(t.id) ? "Selezionato" : "Seleziona"}</span>}
                  </span>
                  <span className="block break-words text-sm font-medium leading-relaxed text-wm-foreground">
                    {t.description || t.category?.name || "Movimento senza descrizione"}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <CategoryLabel transaction={t} wrap />
                    <span className="ml-auto">
                      <Amount transaction={t} />
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-wm-muted-foreground">
          <span>
            Pagina {currentPage + 1} di {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="auto"
              disabled={currentPage === 0 || busy}
              onClick={() => setPage(currentPage - 1)}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="auto"
              disabled={currentPage >= totalPages - 1 || busy}
              onClick={() => setPage(currentPage + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Elimina i movimenti selezionati"
        description={`Verranno eliminate definitivamente ${selection.length} transazioni.`}
        onConfirm={async () => {
          if (!selection.length) return;
          await remove.mutateAsync(selection.map((t) => t.id));
          resetSelection();
        }}
      />
      {selected && <TransactionEditModal transaction={selected} onClose={() => setSelected(null)} />}
    </Card>
  );
}
