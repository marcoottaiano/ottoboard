'use client'

import { useState, useRef } from 'react'
import { X, Upload, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateTrip, useUpdateTrip } from '@/hooks/useTrips'
import {
  fetchItineraryItemsAfterDate,
  deleteItineraryItemsAfterDate,
} from '@/hooks/useTripItinerary'
import { DateChangeWarningModal } from './DateChangeWarningModal'
import type { Trip, TripStatus } from '@/types/travel'

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'bozza', label: 'Bozza' },
  { value: 'pianificato', label: 'Pianificato' },
  { value: 'in_corso', label: 'In corso' },
  { value: 'completato', label: 'Completato' },
]

interface Props {
  trip?: Trip
  onClose: () => void
}

export function TripFormModal({ trip, onClose }: Props) {
  const isEditing = !!trip
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip()

  const [nome, setNome] = useState(trip?.nome ?? '')
  const [stato, setStato] = useState<TripStatus>(trip?.stato ?? 'bozza')
  const [dataInizio, setDataInizio] = useState(trip?.data_inizio ?? '')
  const [dataFine, setDataFine] = useState(trip?.data_fine ?? '')
  const [partecipanti, setPartecipanti] = useState(trip?.partecipanti ?? 1)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(trip?.cover_photo_url ?? null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Date-change conflict state
  const [capturedDataFine, setCapturedDataFine] = useState('')
  const [warningItems, setWarningItems] = useState<
    Array<{ id: string; day_date: string; place_nome: string | null }>
  >([])
  const [showWarning, setShowWarning] = useState(false)
  const [warningLoading, setWarningLoading] = useState(false)

  const isPending = createTrip.isPending || updateTrip.isPending

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    const ext = file.name.split('.').pop()?.toLowerCase()
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    if (!ext || !allowed.includes(ext)) {
      setFileError(`Formato non supportato. Usa: ${allowed.join(', ')}`)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Il file supera i 5 MB')
      return
    }
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const validate = (): boolean => {
    if (dataInizio && dataFine && dataFine < dataInizio) {
      setDateError('La data di fine non può essere precedente alla data di inizio')
      return false
    }
    setDateError(null)
    return true
  }

  const doSave = () => {
    const input = {
      nome: nome.trim(),
      stato,
      data_inizio: dataInizio || null,
      data_fine: dataFine || null,
      partecipanti,
    }

    if (isEditing) {
      updateTrip.mutate({ id: trip.id, updates: input, coverFile }, { onSuccess: onClose })
    } else {
      createTrip.mutate({ input, coverFile }, { onSuccess: onClose })
    }
  }

  const handleSubmit = async () => {
    if (!nome.trim()) return
    if (!validate()) return

    // Check for date-shrink conflict only when editing an existing trip with a shorter data_fine
    if (
      isEditing &&
      trip.data_fine &&
      dataFine &&
      dataFine < trip.data_fine
    ) {
      setWarningLoading(true)
      try {
        const affected = await fetchItineraryItemsAfterDate(trip.id, dataFine)
        setWarningLoading(false)
        if (affected.length > 0) {
          setCapturedDataFine(dataFine)
          setWarningItems(affected)
          setShowWarning(true)
          return
        }
      } catch {
        setWarningLoading(false)
        toast.error('Errore nel verificare gli elementi dell\'itinerario')
        return
      }
    }

    doSave()
  }

  const handleWarningConfirm = async () => {
    setWarningLoading(true)
    try {
      await deleteItineraryItemsAfterDate(trip!.id, capturedDataFine)
      setWarningLoading(false)
      setShowWarning(false)
      doSave()
    } catch {
      setWarningLoading(false)
      toast.error('Errore durante l\'eliminazione degli elementi. Riprova.')
    }
  }

  const handleWarningCancel = () => {
    // Revert data_fine to original value
    setDataFine(trip?.data_fine ?? '')
    setShowWarning(false)
  }

  const canSubmit = nome.trim().length > 0 && !isPending && !warningLoading

  return (
    <>
    {showWarning && (
      <DateChangeWarningModal
        affectedItems={warningItems}
        newDataFine={capturedDataFine}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
        isLoading={warningLoading}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">
            {isEditing ? 'Modifica viaggio' : 'Nuovo viaggio'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Cover photo */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Foto di copertina
            </label>
            <div
              className="relative h-28 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden cursor-pointer hover:border-white/[0.14] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview}
                  alt="Anteprima copertina"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1.5 text-white/20">
                  <ImageIcon size={20} />
                  <span className="text-[11px]">Carica immagine</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white/60 text-[10px]">
                  <Upload size={10} />
                  Scegli
                </div>
              </div>
            </div>
            {fileError && (
              <p className="text-[11px] text-red-400 mt-1.5">{fileError}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nome */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Vacanze in Toscana"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Stato */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Stato
            </label>
            <select
              value={stato}
              onChange={(e) => setStato(e.target.value as TripStatus)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors appearance-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0f0f1a]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1.5">
                Data inizio
              </label>
              <input
                type="date"
                value={dataInizio}
                onChange={(e) => { setDataInizio(e.target.value); setDateError(null) }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1.5">
                Data fine
              </label>
              <input
                type="date"
                value={dataFine}
                min={dataInizio || undefined}
                onChange={(e) => { setDataFine(e.target.value); setDateError(null) }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
          </div>
          {dateError && (
            <p className="text-[11px] text-red-400">{dateError}</p>
          )}

          {/* Partecipanti */}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1.5">
              Partecipanti
            </label>
            <input
              type="number"
              min={1}
              value={partecipanti}
              onChange={(e) => setPartecipanti(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isPending || warningLoading ? 'Salvataggio…' : isEditing ? 'Salva modifiche' : 'Crea viaggio'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
