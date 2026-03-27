'use client'

import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useCreateTransport, useUpdateTransport, useDeleteTransport } from '@/hooks/useTripTransports'
import type {
  TripTransport,
  TransportCategoria,
  TransportPrezzoTipo,
  CreateTransportInput,
  UpdateTransportInput,
} from '@/types/travel'

interface Props {
  tripId: string
  transport?: TripTransport | null
  onClose: () => void
}

export function TransportFormModal({ tripId, transport, onClose }: Props) {
  const createTransport = useCreateTransport()
  const updateTransport = useUpdateTransport()
  const deleteTransport = useDeleteTransport()

  const [nome, setNome] = useState(transport?.nome ?? '')
  const [categoria, setCategoria] = useState<TransportCategoria>(transport?.categoria ?? 'outbound')
  const [prezzo, setPrezzo] = useState<string>(
    transport?.prezzo != null ? String(transport.prezzo) : ''
  )
  const [prezzoTipo, setPrezzoTipo] = useState<TransportPrezzoTipo>(
    transport?.prezzo_tipo ?? 'per_persona'
  )
  const [descrizione, setDescrizione] = useState(transport?.descrizione ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }

    const parsedPrezzo = prezzo !== '' ? parseFloat(prezzo) : null
    if (prezzo !== '' && isNaN(parsedPrezzo!)) {
      setError('Il prezzo non è valido')
      return
    }

    if (transport) {
      const updates: UpdateTransportInput = {
        nome: nome.trim(),
        categoria,
        prezzo: parsedPrezzo,
        prezzo_tipo: prezzoTipo,
        descrizione: descrizione.trim() || null,
      }
      updateTransport.mutate(
        { id: transport.id, tripId, updates },
        { onSuccess: onClose }
      )
    } else {
      const input: CreateTransportInput = {
        trip_id: tripId,
        nome: nome.trim(),
        categoria,
        prezzo: parsedPrezzo,
        prezzo_tipo: prezzoTipo,
        descrizione: descrizione.trim() || null,
      }
      createTransport.mutate(input, { onSuccess: onClose })
    }
  }

  const handleDelete = () => {
    if (!transport) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteTransport.mutate(
      { id: transport.id, tripId },
      { onSuccess: onClose }
    )
  }

  const isPending =
    createTransport.isPending || updateTransport.isPending || deleteTransport.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">
            {transport ? 'Modifica trasporto' : 'Aggiungi trasporto'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Nome *</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Volo Roma → Tokyo"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Categoria</label>
            <div className="flex gap-2">
              {(
                [
                  { value: 'outbound', label: 'Per arrivare' },
                  { value: 'locale', label: 'Locale' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategoria(value)}
                  className={[
                    'flex-1 py-1.5 text-xs rounded-xl border transition-all duration-200',
                    categoria === value
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'text-white/40 border-white/[0.08] hover:bg-white/[0.04]',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Prezzo + tipo */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1.5">Prezzo (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value)}
                placeholder="Es. 350"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/50 mb-1.5">Tipo prezzo</label>
              <select
                value={prezzoTipo}
                onChange={(e) => setPrezzoTipo(e.target.value as TransportPrezzoTipo)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              >
                <option value="per_persona" className="bg-[#111]">Per persona</option>
                <option value="totale" className="bg-[#111]">Totale</option>
              </select>
            </div>
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Descrizione</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Numero volo, orario partenza..."
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            {transport ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={[
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all duration-200 disabled:opacity-50',
                  confirmDelete
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-white/30 border-white/[0.06] hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20',
                ].join(' ')}
              >
                <Trash2 size={12} />
                {confirmDelete ? 'Conferma' : 'Elimina'}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-4 py-1.5 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                {isPending ? 'Salvataggio...' : transport ? 'Salva' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
