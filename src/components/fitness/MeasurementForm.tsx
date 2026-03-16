'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import {
  useCreateBodyMeasurement,
  useUserBodyProfile,
  useUpsertUserBodyProfile,
} from '@/hooks/useBodyMeasurements'
import { calcBodyComposition } from '@/lib/bodyComposition'
import { Select } from '@/components/ui/Select'
import type { CreateBodyMeasurementInput } from '@/types'

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


function NumInput({ label, value, onChange, unit }: {
  label: string; value: string; onChange: (v: string) => void; unit: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-500">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white pr-8 focus:outline-none focus:border-orange-500/50"
          placeholder="—"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  )
}

export function MeasurementForm() {
  const { data: profile } = useUserBodyProfile()
  const createMeasurement = useCreateBodyMeasurement()
  const upsertProfile = useUpsertUserBodyProfile()

  const today = toLocalDateStr(new Date())
  const [date, setDate] = useState(today)

  // Peso
  const [weight, setWeight] = useState('')

  // Plicometrie
  const [showSkinfolds, setShowSkinfolds] = useState(false)
  const [skinfoldChest, setSkinfoldChest] = useState('')
  const [skinfoldAbdomen, setSkinfoldAbdomen] = useState('')
  const [skinfoldThigh, setSkinfoldThigh] = useState('')
  const [skinfoldTricep, setSkinfoldTricep] = useState('')
  const [skinfoldSuprailiac, setSkinfoldSuprailiac] = useState('')
  const [skinfoldSubscapular, setSkinfoldSubscapular] = useState('')
  const [skinfoldMidaxillary, setSkinfoldMidaxillary] = useState('')

  // Circonferenze
  const [showCircumferences, setShowCircumferences] = useState(false)
  const [circWaist, setCircWaist] = useState('')
  const [circHip, setCircHip] = useState('')
  const [circChest, setCircChest] = useState('')
  const [circArm, setCircArm] = useState('')
  const [circForearm, setCircForearm] = useState('')
  const [circThigh, setCircThigh] = useState('')
  const [circCalf, setCircCalf] = useState('')
  const [circNeck, setCircNeck] = useState('')

  // Profilo inline
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileHeight, setProfileHeight] = useState('')
  const [profileSex, setProfileSex] = useState<'male' | 'female'>('male')
  const [profileBirth, setProfileBirth] = useState('')

  const [error, setError] = useState<string | null>(null)

  const parseOpt = (v: string): number | undefined =>
    v.trim() !== '' && parseFloat(v) > 0 ? parseFloat(v) : undefined

  // Preview % grasso in tempo reale
  const previewFat = (): number | null => {
    if (!profile) return null
    const input: CreateBodyMeasurementInput = {
      measured_at: date,
      weight_kg: parseOpt(weight),
      skinfold_chest: parseOpt(skinfoldChest),
      skinfold_abdomen: parseOpt(skinfoldAbdomen),
      skinfold_thigh: parseOpt(skinfoldThigh),
      skinfold_tricep: parseOpt(skinfoldTricep),
      skinfold_suprailiac: parseOpt(skinfoldSuprailiac),
      skinfold_subscapular: parseOpt(skinfoldSubscapular),
      skinfold_midaxillary: parseOpt(skinfoldMidaxillary),
    }
    const result = calcBodyComposition(input, profile)
    return result.body_fat_pct
  }

  const fatPreview = previewFat()

  const handleSaveProfile = async () => {
    setError(null)
    const h = parseFloat(profileHeight)
    if (!h || h < 100 || h > 250) { setError('Altezza non valida (100-250 cm)'); return }
    if (!profileBirth) { setError('Inserisci la data di nascita'); return }
    try {
      await upsertProfile.mutateAsync({ height_cm: h, sex: profileSex, birth_date: profileBirth })
      setShowProfileForm(false)
    } catch {
      setError('Errore nel salvataggio del profilo')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!date) { setError('La data è obbligatoria'); return }

    // Verifica che almeno un campo sia compilato
    const allValues = [weight, skinfoldChest, skinfoldAbdomen, skinfoldThigh,
      skinfoldTricep, skinfoldSuprailiac, skinfoldSubscapular, skinfoldMidaxillary,
      circWaist, circHip, circChest, circArm, circForearm, circThigh, circCalf, circNeck]
    if (allValues.every(v => v.trim() === '')) {
      setError('Inserisci almeno una misurazione')
      return
    }

    const input: CreateBodyMeasurementInput = {
      measured_at: date,
      weight_kg: parseOpt(weight),
      skinfold_chest: parseOpt(skinfoldChest),
      skinfold_abdomen: parseOpt(skinfoldAbdomen),
      skinfold_thigh: parseOpt(skinfoldThigh),
      skinfold_tricep: parseOpt(skinfoldTricep),
      skinfold_suprailiac: parseOpt(skinfoldSuprailiac),
      skinfold_subscapular: parseOpt(skinfoldSubscapular),
      skinfold_midaxillary: parseOpt(skinfoldMidaxillary),
      circ_waist: parseOpt(circWaist),
      circ_hip: parseOpt(circHip),
      circ_chest: parseOpt(circChest),
      circ_arm: parseOpt(circArm),
      circ_forearm: parseOpt(circForearm),
      circ_thigh: parseOpt(circThigh),
      circ_calf: parseOpt(circCalf),
      circ_neck: parseOpt(circNeck),
    }

    try {
      await createMeasurement.mutateAsync(input)
      // Reset form
      setWeight(''); setDate(today)
      setSkinfoldChest(''); setSkinfoldAbdomen(''); setSkinfoldThigh('')
      setSkinfoldTricep(''); setSkinfoldSuprailiac(''); setSkinfoldSubscapular(''); setSkinfoldMidaxillary('')
      setCircWaist(''); setCircHip(''); setCircChest(''); setCircArm('')
      setCircForearm(''); setCircThigh(''); setCircCalf(''); setCircNeck('')
    } catch {
      setError('Errore durante il salvataggio')
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Nuova sessione</h3>

      {/* Banner profilo mancante */}
      {!profile && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-orange-400 mt-0.5 shrink-0" />
            <p className="text-xs text-orange-300">
              Inserisci il tuo profilo per calcolare automaticamente % grasso e composizione corporea.
            </p>
          </div>
          {!showProfileForm ? (
            <button
              onClick={() => setShowProfileForm(true)}
              className="text-xs text-orange-400 hover:text-orange-300 underline"
            >
              Inserisci profilo →
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Altezza" value={profileHeight} onChange={setProfileHeight} unit="cm" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Sesso</label>
                  <Select
                    value={profileSex}
                    onChange={v => setProfileSex(v as 'male' | 'female')}
                    options={[{ value: 'male', label: 'Uomo' }, { value: 'female', label: 'Donna' }]}
                    showPlaceholder={false}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Data di nascita</label>
                <input
                  type="date"
                  value={profileBirth}
                  onChange={e => setProfileBirth(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={upsertProfile.isPending}
                className="w-full py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
              >
                {upsertProfile.isPending ? 'Salvataggio...' : 'Salva profilo'}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Base: data + peso */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <NumInput label="Peso" value={weight} onChange={setWeight} unit="kg" />
        </div>

        {/* Preview % grasso */}
        {fatPreview !== null && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <span className="text-xs text-gray-400">% Grasso stimata:</span>
            <span className="text-sm font-bold text-orange-300">{fatPreview}%</span>
          </div>
        )}

        {/* Sezione plicometrie */}
        <div>
          <button
            type="button"
            onClick={() => setShowSkinfolds(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
          >
            {showSkinfolds ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Plicometrie (mm)
          </button>
          {showSkinfolds && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumInput label="Petto" value={skinfoldChest} onChange={setSkinfoldChest} unit="mm" />
              <NumInput label="Addome" value={skinfoldAbdomen} onChange={setSkinfoldAbdomen} unit="mm" />
              <NumInput label="Coscia" value={skinfoldThigh} onChange={setSkinfoldThigh} unit="mm" />
              <NumInput label="Tricipite" value={skinfoldTricep} onChange={setSkinfoldTricep} unit="mm" />
              <NumInput label="Soprailiaca" value={skinfoldSuprailiac} onChange={setSkinfoldSuprailiac} unit="mm" />
              <NumInput label="Sottoscapolare" value={skinfoldSubscapular} onChange={setSkinfoldSubscapular} unit="mm" />
              <NumInput label="Ascellare" value={skinfoldMidaxillary} onChange={setSkinfoldMidaxillary} unit="mm" />
            </div>
          )}
        </div>

        {/* Sezione circonferenze */}
        <div>
          <button
            type="button"
            onClick={() => setShowCircumferences(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
          >
            {showCircumferences ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Circonferenze (cm)
          </button>
          {showCircumferences && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumInput label="Vita" value={circWaist} onChange={setCircWaist} unit="cm" />
              <NumInput label="Fianchi" value={circHip} onChange={setCircHip} unit="cm" />
              <NumInput label="Petto" value={circChest} onChange={setCircChest} unit="cm" />
              <NumInput label="Braccio" value={circArm} onChange={setCircArm} unit="cm" />
              <NumInput label="Avambraccio" value={circForearm} onChange={setCircForearm} unit="cm" />
              <NumInput label="Coscia" value={circThigh} onChange={setCircThigh} unit="cm" />
              <NumInput label="Polpaccio" value={circCalf} onChange={setCircCalf} unit="cm" />
              <NumInput label="Collo" value={circNeck} onChange={setCircNeck} unit="cm" />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={createMeasurement.isPending}
          className="w-full py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {createMeasurement.isPending ? 'Salvataggio...' : 'Salva sessione'}
        </button>
      </form>
    </div>
  )
}
