"use client";

import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Card } from "@/components/watermelon-ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/watermelon-ui/table";

import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useFinanceMutations";
import { Select, SelectOption } from "@/components/ui/Select";
import { TransactionType } from "@/types";
import { Upload, ChevronDown, ChevronUp } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { DataError } from "@/components/ui/DataError";
import { Checkbox } from "@/components/watermelon-ui/checkbox";

function parseCSV(text: string): string[][] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const cols: string[] = [];
      let inQuotes = false;
      let current = "";
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cols.push(current.trim());
      return cols;
    });
}

function detectColumnMapping(headers: string[]): Partial<ColMapping> {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const findCol = (patterns: string[]): number | null => {
    const idx = lower.findIndex((h) => patterns.some((p) => h.includes(p)));
    return idx === -1 ? null : idx;
  };

  const dateIdx = findCol(["data", "date", "datum", "fecha", "giorno", "day"]);
  const amountIdx = findCol(["importo", "amount", "importe", "betrag", "valore", "value", "cifra", "totale", "total"]);
  const descriptionIdx = findCol(["descrizione", "description", "desc", "causale", "note", "memo", "oggetto"]);
  const typeIdx = findCol(["tipo", "type", "segno", "sign"]);

  const result: Partial<ColMapping> = {};
  if (dateIdx !== null) result.date = dateIdx;
  if (amountIdx !== null) result.amount = amountIdx;
  if (descriptionIdx !== null) result.description = descriptionIdx;
  if (typeIdx !== null) result.type = typeIdx;

  return result;
}

// P6: use amount.toFixed(2) to avoid float precision mismatches between CSV parsing and DB values
// P16: omit trailing pipe when description is absent, matching the fallback spec (date|amount)
const makeFingerprint = (date: string, amount: number, desc: string | null): string => {
  const normalizedDesc = (desc ?? "").toLowerCase().trim();
  const base = `${date}|${amount.toFixed(2)}`;
  return normalizedDesc ? `${base}|${normalizedDesc}` : base;
};

type Step = "upload" | "mapping" | "preview" | "done";

interface ColMapping {
  date: number;
  amount: number;
  type: number | null;
  description: number | null;
  categoryName: number | null;
}

// P1: removed unused `month` prop — dedup now queries all transactions, not just current month
export function CSVImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColMapping>({
    date: 0,
    amount: 1,
    type: null,
    description: null,
    categoryName: null,
  });
  const [autoDetectedFields, setAutoDetectedFields] = useState<Set<keyof ColMapping>>(new Set());
  // P4: separate counters for accurate summary message
  const [report, setReport] = useState<{ inserted: number; duplicatesSkipped: number; parseErrors: number } | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);
  // userIncludedRows: tracks rows the user explicitly chose to include despite being flagged as duplicates
  const [userIncludedRows, setUserIncludedRows] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const { data: categories, isError: categoriesError, refetch: refetchCategories } = useCategories();
  const createTx = useCreateTransaction();

  // Share the complete-history cache with the overview for duplicate detection.
  const {
    data: allTxns = [],
    isLoading: txnsLoading,
    isFetching: txnsFetching,
    isError: txnsError,
    refetch: refetchTransactions,
  } = useTransactions({});

  // Build fingerprint set from existing transactions
  const existingFingerprints = useMemo((): Set<string> => {
    return new Set(allTxns.map((t) => makeFingerprint(t.date, t.amount, t.description)));
  }, [allTxns]);

  // Compute duplicate row indices whenever rows, mapping, or fingerprint set changes
  const duplicateRowIndices = useMemo((): Set<number> => {
    if (txnsLoading || txnsError) return new Set();
    const dupes = new Set<number>();
    rows.forEach((row, i) => {
      const date = row[mapping.date]?.trim() ?? "";
      const amountRaw = row[mapping.amount]?.replace(",", ".").replace(/[^\d.]/g, "");
      const amount = parseFloat(amountRaw);
      if (!date || isNaN(amount)) return;
      const desc = mapping.description !== null ? (row[mapping.description] ?? null) : null;
      if (existingFingerprints.has(makeFingerprint(date, amount, desc))) {
        dupes.add(i);
      }
    });
    return dupes;
  }, [rows, mapping, existingFingerprints, txnsLoading, txnsError]);

  const isRowExcluded = (i: number): boolean => duplicateRowIndices.has(i) && !userIncludedRows.has(i);

  // P2: count excluded duplicates across ALL rows (not just the preview window)
  const totalExcludedDuplicates = useMemo(
    () => rows.filter((_, i) => duplicateRowIndices.has(i) && !userIncludedRows.has(i)).length,
    [rows, duplicateRowIndices, userIncludedRows],
  );

  const handleFile = (file: File) => {
    if (importingRef.current) return;
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        setFileError("Formato del file non leggibile.");
        return;
      }
      const allRows = parseCSV(text);
      if (allRows.length < 2) {
        setFileError("Il CSV deve contenere intestazioni e almeno una riga.");
        return;
      }
      const parsedHeaders = allRows[0];
      setHeaders(parsedHeaders);
      setRows(allRows.slice(1));

      const detected = detectColumnMapping(parsedHeaders);
      const detectedKeys = new Set<keyof ColMapping>(Object.keys(detected) as Array<keyof ColMapping>);
      setAutoDetectedFields(detectedKeys);
      setMapping({ date: 0, amount: 1, type: null, description: null, categoryName: null, ...detected });

      setStep("mapping");
    };
    reader.onerror = () => setFileError("Impossibile leggere il file selezionato.");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleGoToPreview = () => {
    // P3: reset user overrides whenever (re-)entering preview, so stale inclusions from previous mapping don't persist
    setUserIncludedRows(new Set());
    setStep("preview");
  };

  const handleToggleInclude = (rowIndex: number, include: boolean) => {
    setUserIncludedRows((prev) => {
      const next = new Set(prev);
      if (include) {
        next.add(rowIndex);
      } else {
        next.delete(rowIndex);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (importingRef.current || txnsLoading || txnsFetching || txnsError || categoriesError) return;
    importingRef.current = true;
    setIsImporting(true);

    // Snapshot exclusion state at import time to avoid stale-closure issues mid-loop
    const dupeIndicesSnapshot = duplicateRowIndices;
    const userIncludedSnapshot = userIncludedRows;
    const isExcluded = (i: number) => dupeIndicesSnapshot.has(i) && !userIncludedSnapshot.has(i);

    // in-memory dedup key includes description (P6/P16: uses toFixed(2) + no trailing pipe)
    const seenKeys = new Set<string>();

    let inserted = 0;
    let duplicatesSkipped = 0;
    // P4: track parse/validation errors separately from duplicates
    let parseErrors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip rows excluded as server-side duplicates
      if (isExcluded(i)) {
        duplicatesSkipped++;
        continue;
      }

      const date = row[mapping.date]?.trim();
      const amountRaw = row[mapping.amount]?.replace(",", ".").replace(/[^\d.]/g, "");
      const amount = parseFloat(amountRaw);
      if (!date || !Number.isFinite(amount) || amount <= 0) {
        parseErrors++;
        continue;
      }

      const descValue = mapping.description !== null ? (row[mapping.description] ?? null) : null;

      // in-memory dedup (within-file duplicates)
      const key = makeFingerprint(date, amount, descValue);
      if (seenKeys.has(key)) {
        duplicatesSkipped++;
        continue;
      }

      const typeRaw = mapping.type !== null ? row[mapping.type]?.toLowerCase() : "expense";
      const type: TransactionType = typeRaw?.includes("entrat") || typeRaw?.includes("income") ? "income" : "expense";

      const description = descValue ?? undefined;
      const catName = mapping.categoryName !== null ? row[mapping.categoryName]?.trim() : undefined;
      const category = catName ? categories?.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : undefined;

      const defaultCategory = categories?.find((c) => c.name === "Altro" && (c.type === type || c.type === "both"));
      const resolvedCategory =
        category && (category.type === type || category.type === "both") ? category : defaultCategory;
      if (!resolvedCategory) {
        parseErrors++;
        continue;
      }

      try {
        await createTx.mutateAsync({
          amount,
          type,
          category_id: resolvedCategory.id,
          description,
          date,
        });
        seenKeys.add(key);
        inserted++;
      } catch {
        parseErrors++;
      }
    }

    setReport({ inserted, duplicatesSkipped, parseErrors });
    setStep("done");
    setIsImporting(false);
    importingRef.current = false;
  };

  const reset = () => {
    if (importingRef.current) return;
    setStep("upload");
    setRows([]);
    setHeaders([]);
    setReport(null);
    setAutoDetectedFields(new Set());
    setMapping({ date: 0, amount: 1, type: null, description: null, categoryName: null });
    setUserIncludedRows(new Set());
  };

  const colOptions: SelectOption[] = headers.map((h, i) => ({
    label: h || `Colonna ${i + 1}`,
    value: String(i),
  }));

  const FIELDS: { key: keyof ColMapping; label: string; required: boolean }[] = [
    { key: "date", label: "Data *", required: true },
    { key: "amount", label: "Importo *", required: true },
    { key: "type", label: "Tipo (entrata/uscita)", required: false },
    { key: "description", label: "Descrizione", required: false },
    { key: "categoryName", label: "Categoria", required: false },
  ];

  const PREVIEW_LIMIT = 10;

  return (
    <Card className="wm-card">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex h-auto w-full items-center justify-between p-5 text-sm text-wm-muted-foreground transition-colors hover:text-wm-foreground"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} />
          Import CSV
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </Button>

      {fileError && (
        <p role="alert" className="px-5 text-sm text-wm-destructive">
          {fileError}
        </p>
      )}
      {categoriesError && (
        <DataError onRetry={() => void refetchCategories()} message="Impossibile caricare le categorie." />
      )}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-wm-border">
          {step === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-wm-border rounded-xl p-8 text-center cursor-pointer hover:border-wm-border transition-colors"
            >
              <Upload size={24} className="mx-auto text-wm-muted-foreground mb-2" />
              <p className="text-sm text-wm-muted-foreground">Trascina un file CSV qui o clicca per selezionarlo</p>
              <Input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {step === "mapping" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-wm-muted-foreground">{rows.length} righe trovate. Mappa le colonne:</p>
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(({ key, label, required }) => {
                  const currentVal = mapping[key];
                  const strVal = currentVal !== null ? String(currentVal) : "";
                  const isAutoDetected = autoDetectedFields.has(key);
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs text-wm-muted-foreground">{label}</label>
                        {isAutoDetected && <span className="text-xs text-wm-primary">rilevato</span>}
                      </div>
                      <Select
                        value={strVal}
                        onChange={(v) => {
                          setMapping((m) => ({ ...m, [key]: v === "" ? null : Number(v) }));
                          setAutoDetectedFields((prev) => {
                            const next = new Set(prev);
                            next.delete(key);
                            return next;
                          });
                        }}
                        options={colOptions}
                        placeholder="— Non mappare"
                        showPlaceholder={!required}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoToPreview}
                  className="flex-1 py-2 text-xs rounded-lg bg-wm-success/20 border border-wm-success/30 text-wm-primary hover:bg-wm-success/30 transition-colors"
                >
                  Anteprima →
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="px-3 py-2 text-xs rounded-lg hover:bg-wm-muted text-wm-muted-foreground transition-colors"
                >
                  Annulla
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="mt-4 space-y-3">
              {/* Loading indicator */}
              {txnsLoading && <p className="text-xs text-wm-warning">Rilevamento duplicati in corso...</p>}
              {/* P5: non-blocking error warning */}
              {txnsError && (
                <DataError
                  onRetry={() => void refetchTransactions()}
                  message="Impossibile verificare i duplicati. Riprova prima di importare."
                />
              )}
              {/* P2: show total across ALL rows, not just preview window */}
              {!txnsLoading && !txnsError && totalExcludedDuplicates > 0 && (
                <p className="text-xs text-wm-warning">
                  {totalExcludedDuplicates} probabil
                  {totalExcludedDuplicates === 1 ? "e duplicato rilevato" : "i duplicati rilevati"} nel file
                  {rows.length > PREVIEW_LIMIT && " (solo i primi 10 sono visibili nell'anteprima)"}
                </p>
              )}
              <p className="text-xs text-wm-muted-foreground">Anteprima prime {PREVIEW_LIMIT} righe:</p>
              <div className="overflow-x-auto overflow-y-hidden">
                <Table className="w-full text-xs">
                  <TableHeader>
                    <TableRow className="text-left text-wm-muted-foreground border-b border-wm-border">
                      <TableHead className="pb-1.5 font-normal">Data</TableHead>
                      <TableHead className="pb-1.5 font-normal">Importo</TableHead>
                      <TableHead className="pb-1.5 font-normal">Tipo</TableHead>
                      <TableHead className="pb-1.5 font-normal">Descrizione</TableHead>
                      <TableHead className="pb-1.5 font-normal">
                        <span className="sr-only">Duplicati</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, PREVIEW_LIMIT).map((row, i) => {
                      const isDuplicate = duplicateRowIndices.has(i);
                      const isExcluded = isRowExcluded(i);
                      return (
                        <TableRow key={i} className={`border-b border-wm-border ${isExcluded ? "opacity-50" : ""}`}>
                          <TableCell className="py-1 text-wm-muted-foreground">{row[mapping.date]}</TableCell>
                          <TableCell className="py-1 text-wm-muted-foreground">{row[mapping.amount]}</TableCell>
                          <TableCell className="py-1 text-wm-muted-foreground">
                            {mapping.type !== null ? row[mapping.type] : "—"}
                          </TableCell>
                          <TableCell className="py-1 text-wm-muted-foreground max-w-[160px] truncate">
                            {mapping.description !== null ? row[mapping.description] : "—"}
                          </TableCell>
                          <TableCell className="py-1 pl-2">
                            {isDuplicate && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-wm-warning/20 text-wm-warning whitespace-nowrap">
                                  Probabile duplicato
                                </span>
                                <label className="flex items-center gap-1 cursor-pointer text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors whitespace-nowrap">
                                  <Checkbox
                                    checked={!isExcluded}
                                    onCheckedChange={(checked) => handleToggleInclude(i, checked === true)}
                                    disabled={isImporting}
                                  />
                                  <span className="text-[10px]">Includi comunque</span>
                                </label>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="text-xs text-wm-muted-foreground">
                  Mostrando {PREVIEW_LIMIT} di {rows.length} righe — tutte verranno importate
                </p>
              )}
              <div className="flex gap-2">
                {/* P5: disable also when txnsError; update label to signal degraded state */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImport}
                  disabled={isImporting || txnsLoading || txnsFetching || txnsError || categoriesError}
                  className="flex-1 py-2 text-xs rounded-lg bg-wm-success/20 border border-wm-success/30 text-wm-primary hover:bg-wm-success/30 transition-colors disabled:opacity-50"
                >
                  {isImporting ? "Importando..." : `Importa ${rows.length} righe`}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isImporting}
                  onClick={() => setStep("mapping")}
                  className="px-3 py-2 text-xs rounded-lg hover:bg-wm-muted text-wm-muted-foreground transition-colors"
                >
                  ← Indietro
                </Button>
              </div>
            </div>
          )}

          {/* P4: accurate summary — duplicates and parse errors counted separately */}
          {step === "done" && report && (
            <div className="mt-4 p-4 rounded-lg bg-wm-muted text-center space-y-1">
              <p className="text-wm-primary text-sm font-medium">
                {report.inserted} transazioni importate, {report.duplicatesSkipped} duplicate ignorate
                {report.parseErrors > 0 && `, ${report.parseErrors} righe non valide`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="mt-2 text-xs text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
              >
                Importa altro file
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
