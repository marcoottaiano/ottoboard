'use client'

import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { useCreateTransaction } from '@/hooks/useFinanceMutations'
import { Select, SelectOption } from '@/components/ui/Select'
import { TransactionType } from '@/types'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { useRef, useState } from 'react'

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

type Step = 'upload' | 'mapping' | 'preview' | 'done'

interface ColMapping {
  date: number
  amount: number
  type: number | null
  description: number | null
  categoryName: number | null
}

interface Props {
  month: string
}

export function CSVImport({ month }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColMapping>({ date: 0, amount: 1, type: null, description: null, categoryName: null })
  const [autoDetectedFields, setAutoDetectedFields] = useState<Set<keyof ColMapping>>(new Set())
  const [report, setReport] = useState<{ inserted: number; skipped: number } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useCategories()
  const { data: existingTx } = useTransactions({ month })
  const createTx = useCreateTransaction()

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
      setMapping((prev) => ({
        ...prev,
        ...detected,
      }))

      setStep('mapping')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const handleImport = async () => {
    setIsImporting(true)
    const existingKeys = new Set(
      (existingTx ?? []).map((t) => `${t.date}|${t.amount}`)
    )

    let inserted = 0
    let skipped = 0

    for (const row of rows) {
      const date = row[mapping.date]?.trim()
      const amountRaw = row[mapping.amount]?.replace(',', '.').replace(/[^\d.]/g, '')
      const amount = parseFloat(amountRaw)
      if (!date || !amount) { skipped++; continue }

      const key = `${date}|${amount}`
      if (existingKeys.has(key)) { skipped++; continue }

      const typeRaw = mapping.type !== null ? row[mapping.type]?.toLowerCase() : 'expense'
      const type: TransactionType = typeRaw?.includes('entrat') || typeRaw?.includes('income') ? 'income' : 'expense'

      const description = mapping.description !== null ? row[mapping.description] : undefined
      const catName = mapping.categoryName !== null ? row[mapping.categoryName]?.trim() : undefined
      const category = catName ? categories?.find((c) => c.name.toLowerCase() === catName.toLowerCase()) : undefined

      const defaultCategory = categories?.find((c) => c.name === 'Altro')
      if (!defaultCategory && !category) { skipped++; continue }

      try {
        await createTx.mutateAsync({
          amount,
          type,
          category_id: category?.id ?? defaultCategory!.id,
          description,
          date,
        })
        existingKeys.add(key)
        inserted++
      } catch {
        skipped++
      }
    }

    setReport({ inserted, skipped })
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
  }

  // Convert headers to SelectOption with string values
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
                <button onClick={() => setStep('preview')} className="flex-1 py-2 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                  Anteprima →
                </button>
                <button onClick={reset} className="px-3 py-2 text-xs rounded-lg hover:bg-white/10 text-gray-500 transition-colors">Annulla</button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-gray-500">Anteprima prime {PREVIEW_LIMIT} righe:</p>
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-white/5">
                      <th className="pb-1.5 font-normal">Data</th>
                      <th className="pb-1.5 font-normal">Importo</th>
                      <th className="pb-1.5 font-normal">Tipo</th>
                      <th className="pb-1.5 font-normal">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_LIMIT).map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-1 text-gray-400">{row[mapping.date]}</td>
                        <td className="py-1 text-gray-300">{row[mapping.amount]}</td>
                        <td className="py-1 text-gray-400">{mapping.type !== null ? row[mapping.type] : '—'}</td>
                        <td className="py-1 text-gray-500 max-w-[160px] truncate">{mapping.description !== null ? row[mapping.description] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="text-xs text-gray-600">
                  Mostrando {PREVIEW_LIMIT} di {rows.length} righe — tutte verranno importate
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={handleImport} disabled={isImporting} className="flex-1 py-2 text-xs rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                  {isImporting ? 'Importando...' : `Importa ${rows.length} righe`}
                </button>
                <button onClick={() => setStep('mapping')} className="px-3 py-2 text-xs rounded-lg hover:bg-white/10 text-gray-500 transition-colors">← Indietro</button>
              </div>
            </div>
          )}

          {step === 'done' && report && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 text-center space-y-1">
              <p className="text-emerald-400 text-sm font-medium">
                {report.inserted} transazioni importate, {report.skipped} righe saltate
              </p>
              <button onClick={reset} className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">Importa altro file</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
