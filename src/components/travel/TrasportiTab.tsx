'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useTripTransports, useDeleteTransport } from '@/hooks/useTripTransports'
import { TransportFormModal } from './TransportFormModal'
import type { TripTransport } from '@/types/travel'

interface TransportRowProps {
  transport: TripTransport
  onEdit: () => void
}

function TransportRow({ transport, onEdit }: TransportRowProps) {
  const deleteTransport = useDeleteTransport()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    deleteTransport.mutate({ id: transport.id, tripId: transport.trip_id })
  }

  const prezzoLabel =
    transport.prezzo != null
      ? `€${transport.prezzo.toFixed(2)} ${transport.prezzo_tipo === 'per_persona' ? '/ pers' : 'totale'}`
      : null

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.10] transition-all duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{transport.nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {prezzoLabel && (
            <span className="text-xs text-white/40">{prezzoLabel}</span>
          )}
          {transport.descrizione && (
            <span className="text-xs text-white/30 truncate">{transport.descrizione}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
          title="Modifica"
        >
          <Pencil size={13} />
        </button>
        {confirmDelete ? (
          <button
            onClick={handleDelete}
            disabled={deleteTransport.isPending}
            className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg transition-all duration-200"
          >
            Conferma
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Elimina"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  tripId: string
}

export function TrasportiTab({ tripId }: Props) {
  const { data: transports = [], isLoading } = useTripTransports(tripId)
  const [showModal, setShowModal] = useState(false)
  const [editingTransport, setEditingTransport] = useState<TripTransport | null>(null)

  const outbound = transports.filter((t) => t.categoria === 'outbound')
  const locale = transports.filter((t) => t.categoria === 'locale')

  const handleEdit = (transport: TripTransport) => {
    setEditingTransport(transport)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTransport(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all duration-200"
        >
          <Plus size={13} />
          Aggiungi
        </button>
      </div>

      {/* Outbound section */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
          Trasporto per arrivare
        </h4>
        {outbound.length === 0 ? (
          <p className="text-xs text-white/25 py-3">Nessun trasporto di andata/ritorno aggiunto.</p>
        ) : (
          <div className="space-y-2">
            {outbound.map((t) => (
              <TransportRow key={t.id} transport={t} onEdit={() => handleEdit(t)} />
            ))}
          </div>
        )}
      </div>

      {/* Local section */}
      <div>
        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
          Trasporti locali
        </h4>
        {locale.length === 0 ? (
          <p className="text-xs text-white/25 py-3">Nessun trasporto locale aggiunto.</p>
        ) : (
          <div className="space-y-2">
            {locale.map((t) => (
              <TransportRow key={t.id} transport={t} onEdit={() => handleEdit(t)} />
            ))}
          </div>
        )}
      </div>

      {transports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-white/30">Nessun trasporto aggiunto. Aggiungi il primo!</p>
        </div>
      )}

      {showModal && (
        <TransportFormModal
          tripId={tripId}
          transport={editingTransport}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
