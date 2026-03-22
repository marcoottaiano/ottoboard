'use client'

import { useCategories } from '@/hooks/useCategories'
import { useCreateTransaction } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType } from '@/types'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

function parseCSV(text: string): string[][] {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const cols: string[] = []
      let inQuotes = false
      let current = ''
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes }
        else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = '' }
        else { current += ch }
      }
      cols.push(current.trim())
      return cols
    })
}

function detectColumnMapping(headers: string[]): Partial<ColMapping> {
  const lower = headers.map((h) => h.toLowerCase().trim())
  const findCol = (patterns: string[]): number | null => {
    const idx = lower.findIndex((h) => patterns.some((p) => h.includes(p)))
    return idx === -1 ? null : idx
  }

  const dateIdx = findCol(['data', 'date', 'datum', 'fecha', 'giorno', 'day'])
  const amountIdx = findCol(['importo', 'amount', 'importe', 'betrag', 'valore', 'value', 'cifra', 'totale', 'total'])
  const descriptionIdx = findCol(['descrizione', 'description', 'desc', 'causale', 'note', 'memo', 'oggetto'])
  const typeIdx = findCol(['tipo', 'type', 'segno', 'sign'])

  const result: Partial<ColMapping> = {}
  if (dateIdx !== null) result.date = dateIdx
  if (amountIdx !== null) result.amount = amountIdx
  if (descriptionIdx !== null) result.description = descriptionIdx
  if (typeIdx !== null) result.type = typeIdx

  return result
}

// P6: use amount.toFixed(2) to avoid float precision mismatches between CSV parsing and DB values
// P16: omit trailing pipe when description is absent, matching the fallback spec (date|amount)
const makeFingerprint = (date: string, amount: number, desc: string | null): string => {
  const normalizedDesc = (desc ?? '').toLowerCase().trim()
  const base = `${date}|${amount.toFixed(2)}`
  return normalizedDesc ? `${base}|${normalizedDesc}` : base
}

type Step = 'upload' | 'mapping' | 'preview' | 'done'

interface ColMapping {
  date: number
  amount: number
  type: number | null
  description: number | null
  categoryName: number | null
}

// P1: removed unused `month` prop — dedup now queries all transactions, not just current month
export function CSVImport() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColMapping>({ date: 0, amount: 1, type: null, description: null, categoryName: null })
  const [autoDetectedFields, setAutoDetectedFields] = useState<Set<keyof ColMapping>>(new Set())
  // P4: separate counters for accurate summary message
  const [report, setReport] = useState<{ inserted: number; duplicatesSkipped: number; parseErrors: number } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  // userIncludedRows: tracks rows the user explicitly chose to include despite being flagged as duplicates
  const [userIncludedRows, setUserIncludedRows] = useState<Set<number>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useCategories()
  const createTx = useCreateTransaction()

  // Fetch all transactions for dedup (no month filter), only when in preview step
  const { data: allTxns = [], isLoading: txnsLoading, isError: txnsError } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('transactions')
        .select('date, amount, description')
        .order('date', { ascending: false })
      return (data ?? []) as { date: string; amount: number; description: string | null }[]
    },
    staleTime: 60_000,
    enabled: step === 'preview',
  })

  // Build fingerprint set from existing transactions
  const existingFingerprints = useMemo((): Set<string> => {
    return new Set(
      allTxns.map((t) => makeFingerprint(t.date, t.amount, t.description))
    )
  }, [allTxns])

  // Compute duplicate row indices whenever rows, mapping, or fingerprint set changes
  const duplicateRowIndices = useMemo((): Set<number> => {
    if (txnsLoading || txnsError) return new Set()
    const dupes = new Set<number>()
    rows.forEach((row, i) => {
      const date = row[mapping.date]?.trim() ?? ''
      const amountRaw = row[mapping.amount]?.replace(',', '.').replace(/[^\d.]/g, '')
      const amount = parseFloat(amountRaw)
      if (!date || isNaN(amount)) return
      const desc = mapping.description !== null ? (row[mapping.description] ?? null) : null
      if (existingFingerprints.has(makeFingerprint(date, amount, desc))) {
        dupes.add(i)
      }
    })
    return dupes
  }, [rows, mapping, existingFingerprints, txnsLoading, txnsError])

  const isRowExcluded = (i: number): boolean =>
    duplicateRowIndices.has(i) && !userIncludedRows.has(i)

  // P2: count excluded duplicates across ALL rows (not just the preview window)
  const totalExcludedDuplicates = useMemo(
    () => rows.filter((_, i) => duplicateRowIndices.has(i) && !userIncludedRows.has(i)).length,
    [rows, duplicateRowIndices, userIncludedRows]
  )

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const allRows = parseCSV(text)
      if (allRows.length < 2) return
      const parsedHeaders = allRows[0]
      setHeaders(parsedHeaders)
      setRows(allRows.slice(1))

      const detected = detectColumnMapping(parsedHeaders)
      const detectedKeys = new Set<keyof ColMapping>(Object.keys(detected) as Array<keyof ColMapping>)
      setAutoDetectedFields(detectedKeys)
      setMapping((prev) => ({ ...prev, ...detected }))

      setStep('mapping')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const handleGoToPreview = () => {
    // P3: reset user overrides whenever (re-)entering preview, so stale inclusions from previous mapping don't persist
    setUserIncludedRows(new Set())
    setStep('preview')
  }

  const handleToggleInclude = (rowIndex: number, include: boolean) => {
    setUserIncludedRows((prev) => {
      const next = new Set(prev)
      if (include) {
        next.add(rowIndex)
      } else {
        next.delete(rowIndex)
      }
      return next
    })
  }

  const handleImport = async () => {
    setIsImporting(true)

    // Snapshot exclusion state at import time to avoid stale-closure issues mid-loop
    const dupeIndicesSnapshot = duplicateRowIndices
    const userIncludedSnapshot = userIncludedRows
    const isExcluded = (i: number) => dupeIndicesSnapshot.has(i) && !userIncludedSnapshot.has(i)

    // in-memory dedup key includes description (P6/P16: uses toFixed(2) + no trailing pipe)
    const seenKeys = new Set<string>()

    let inserted = 0
    let duplicatesSkipped = 0
    // P4: track parse/validation errors separately from duplicates
    let parseErrors = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip rows excluded as server-side duplicates
      if (isExcluded(i)) {
        duplicatesSkipped++
        continue
      }

      const date = row[mapping.date]?.trim()
      const amountRaw = row[mapping.amount]?.replace(',', '.').replace(/[^\d.]/g, '')
      const amount = parseFloat(amountRaw)
      if (!date || !amount) { parseErrors++; continue }

      const descValue = mapping.description !== null ? (row[mapping.description] ?? null) : null

      // in-memory dedup (within-file duplicates)
      const key = makeFingerprint(date, amount, descValue)
      if (seenKeys.has(key)) { duplicatesSkipped++; continue }

      const typeRaw = mapping.type !== null ? row[mapping.type]?.toLowerCase() : 'expense'
      const type: TransactionType = typeRaw?.includes('entrat') || typeRaw?.includes('income') ? 'income' : 'expense'

      const description = descValue ?? undefined
      const catName = mapping.categoryName !== null ? row[mapping.categoryName]?.trim() : undefined
      const category = catName ? categories?.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : undefined

      const defaultCategory = categories?.find((c) => c.name === 'Altro')
      if (!defaultCategory && !category) { parseErrors++; continue }

      try {
        await createTx.mutateAsync({
          amount,
          type,
          category_id: category?.id ?? defaultCategory!.id,
          description,
          date,
        })
        seenKeys.add(key)
        inserted++
      } catch {
        parseErrors++
      }
    }

    setReport({ inserted, duplicatesSkipped, parseErrors })
    setStep('done')
    setIsImporting(false)
  }

  const reset = () => {
    setStep('upload')
    setRows([])
    setHeaders([])
    setReport(null)
    setAutoDetectedFields(new Set())
    setMapping({ date: 0, amount: 1, type: null, description: null, categoryName: null })
    setUserIncludedRows(new Set())
  }

  const colOptions: SelectOption[] = headers.map((h, i) => ({
    label: h || `Colonna ${i + 1}`,
    value: String(i),
  }))

  const FIELDS: { key: keyof ColMapping; label: string; required: boolean }[] = [
    { key: 'date', label: 'Data *', required: true },
    { key: 'amount', label: 'Importo *', required: true },
    { key: 'type', label: 'Tipo (entrata/uscita)', required: false },
    { key: 'description', label: 'Descrizione', required: false },
    { key: 'categoryName', label: 'Categoria', required: false },
  ]

  const PREVIEW_LIMIT = 10

  return (
    <div className="rounded-xl bg-white/5 border border-white/10">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Upload size={14} />
          Import CSV
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/5">
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="mt-4 border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-white/20 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">Trascina un file CSV qui o clicca per selezionarlo</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}

          {step === 'mapping' && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500">{rows.length} righe trovate. Mappa le colonne:</p>
              <div className="grid grid-cols-2 gap-2">
                {FIELDS.map(({ key, label, required }) => {
                  const currentVal = mapping[key]
                  const strVal = currentVal !== null ? String(currentVal) : ''
                  const isAutoDetected = autoDetectedFields.has(key)
                  return (
                    <div key={key}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs text-gray-500">{label}</label>
                        {isAutoDetected && (
                          <span className="text-xs text-emerald-400">rilevato</span>
                        )}
                      </div>
                      <Select
                        value={strVal}
                        onChange={(v) => {
                          setMapping((m) => ({ ...m, [key]: v === '' ? null : Number(v) }))
                          setAutoDetectedFields((prev) => {
                            const next = new Set(prev)
                            next.delete(key)
                            return next
                          })
                        }}
                        options={colOptions}
                        placeholder="— Non mappare"
                        showPlaceholder={!required}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={handleGoToPreview} className="flex-1 py-2 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                  Anteprima →
                </button>
                <button onClick={reset} className="px-3 py-2 text-xs rounded-lg hover:bg-white/10 text-gray-500 transition-colors">Annulla</button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="mt-4 space-y-3">
              {/* Loading indicator */}
              {txnsLoading && (
                <p className="text-xs text-amber-400">Rilevamento duplicati in corso...</p>
              )}
              {/* P5: non-blocking error warning */}
              {txnsError && (
                <p className="text-xs text-amber-500">Impossibile verificare i duplicati — controlla manualmente prima di importare</p>
              )}
              {/* P2: show total across ALL rows, not just preview window */}
              {!txnsLoading && !txnsError && totalExcludedDuplicates > 0 && (
                <p className="text-xs text-amber-400">
                  {totalExcludedDuplicates} probabil{totalExcludedDuplicates === 1 ? 'e duplicato rilevato' : 'i duplicati rilevati'} nel file
                  {rows.length > PREVIEW_LIMIT && ' (solo i primi 10 sono visibili nell\'anteprima)'}
                </p>
              )}
              <p className="text-xs text-gray-500">Anteprima prime {PREVIEW_LIMIT} righe:</p>
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-white/5">
                      <th className="pb-1.5 font-normal">Data</th>
                      <th className="pb-1.5 font-normal">Importo</th>
                      <th className="pb-1.5 font-normal">Tipo</th>
                      <th className="pb-1.5 font-normal">Descrizione</th>
                      <th className="pb-1.5 font-normal"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_LIMIT).map((row, i) => {
                      const isDuplicate = duplicateRowIndices.has(i)
                      const isExcluded = isRowExcluded(i)
                      return (
                        <tr key={i} className={`border-b border-white/5 ${isExcluded ? 'opacity-50' : ''}`}>
                          <td className="py-1 text-gray-400">{row[mapping.date]}</td>
                          <td className="py-1 text-gray-300">{row[mapping.amount]}</td>
                          <td className="py-1 text-gray-400">{mapping.type !== null ? row[mapping.type] : '—'}</td>
                          <td className="py-1 text-gray-500 max-w-[160px] truncate">{mapping.description !== null ? row[mapping.description] : '—'}</td>
                          <td className="py-1 pl-2">
                            {isDuplicate && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 whitespace-nowrap">
                                  Probabile duplicato
                                </span>
                                <label className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={!isExcluded}
                                    onChange={(e) => handleToggleInclude(i, e.target.checked)}
                                    className="accent-emerald-400 w-3 h-3"
                                  />
                                  <span className="text-[10px]">Includi comunque</span>
                                </label>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="text-xs text-gray-600">
                  Mostrando {PREVIEW_LIMIT} di {rows.length} righe — tutte verranno importate
                </p>
              )}
              <div className="flex gap-2">
                {/* P5: disable also when txnsError; update label to signal degraded state */}
                <button
                  onClick={handleImport}
                  disabled={isImporting || txnsLoading || txnsError}
                  className="flex-1 py-2 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                  {isImporting ? 'Importando...' : `Importa ${rows.length} righe`}
                </button>
                <button onClick={() => setStep('mapping')} className="px-3 py-2 text-xs rounded-lg hover:bg-white/10 text-gray-500 transition-colors">← Indietro</button>
              </div>
            </div>
          )}

          {/* P4: accurate summary — duplicates and parse errors counted separately */}
          {step === 'done' && report && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 text-center space-y-1">
              <p className="text-emerald-400 text-sm font-medium">
                {report.inserted} transazioni importate, {report.duplicatesSkipped} duplicate ignorate
                {report.parseErrors > 0 && `, ${report.parseErrors} righe non valide`}
              </p>
              <button onClick={reset} className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">Importa altro file</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
