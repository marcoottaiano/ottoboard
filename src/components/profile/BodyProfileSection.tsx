'use client'

import { useState, useEffect } from 'react'
import { Ruler, Edit2, Check, X } from 'lucide-react'
import { useUserBodyProfile, useUpsertUserBodyProfile } from '@/hooks/useBodyMeasurements'
import { Select } from '@/components/ui/Select'

export function BodyProfileSection() {
  const { data: profile, isLoading } = useUserBodyProfile()
  const upsert = useUpsertUserBodyProfile()

  const [editing, setEditing] = useState(false)
  const [height, setHeight] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setHeight(String(profile.height_cm))
      setSex(profile.sex)
      setBirthDate(profile.birth_date)
    }
  }, [profile])

  const handleSave = async () => {
    setError(null)
    const h = parseFloat(height)
    if (!h || h < 100 || h > 250) { setError('Altezza non valida (100–250 cm)'); return }
    if (!birthDate) { setError('Data di nascita obbligatoria'); return }
    try {
      await upsert.mutateAsync({ height_cm: h, sex, birth_date: birthDate })
      setEditing(false)
    } catch {
      setError('Errore nel salvataggio')
    }
  }

  const handleCancel = () => {
    if (profile) {
      setHeight(String(profile.height_cm))
      setSex(profile.sex)
      setBirthDate(profile.birth_date)
    }
    setError(null)
    setEditing(false)
  }

  const calcAge = (bd: string) => {
    const birth = new Date(bd)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
    return age
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white/80">Profilo corporeo</h2>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Edit2 size={13} />
            {profile ? 'Modifica' : 'Configura'}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse bg-white/5 rounded-lg" />
      ) : !editing ? (
        profile ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Altezza</p>
              <p className="text-sm text-white/80 font-medium">{profile.height_cm} cm</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Sesso</p>
              <p className="text-sm text-white/80 font-medium">{profile.sex === 'male' ? 'Uomo' : 'Donna'}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">Età</p>
              <p className="text-sm text-white/80 font-medium">{calcAge(profile.birth_date)} anni</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Aggiungi altezza, sesso e data di nascita per calcolare la composizione corporea nella tab Fitness.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/30">Altezza</label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="250"
                  step="0.5"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white pr-8 focus:outline-none focus:border-orange-500/50"
                  placeholder="175"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">cm</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/30">Sesso</label>
              <Select
                value={sex}
                onChange={v => setSex(v as 'male' | 'female')}
                options={[{ value: 'male', label: 'Uomo' }, { value: 'female', label: 'Donna' }]}
                showPlaceholder={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/30">Data di nascita</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={upsert.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              <Check size={13} />
              {upsert.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-xs hover:text-white transition-colors"
            >
              <X size={13} />
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
