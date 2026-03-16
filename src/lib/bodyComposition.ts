import type { CreateBodyMeasurementInput, UserBodyProfile } from '@/types'

export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ─── Jackson-Pollock ──────────────────────────────────────────────────────────

/**
 * JP3 — 3 pliche
 * Uomo: petto + addome + coscia
 * Donna: tricipite + soprailiaca + coscia
 */
export function jp3BodyDensity(
  sex: 'male' | 'female',
  skinfolds: {
    chest?: number
    abdomen?: number
    thigh?: number
    tricep?: number
    suprailiac?: number
  },
  age: number
): number | null {
  if (sex === 'male') {
    const { chest, abdomen, thigh } = skinfolds
    if (chest == null || abdomen == null || thigh == null) return null
    const sum = chest + abdomen + thigh
    return 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
  } else {
    const { tricep, suprailiac, thigh } = skinfolds
    if (tricep == null || suprailiac == null || thigh == null) return null
    const sum = tricep + suprailiac + thigh
    return 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age
  }
}

/**
 * JP7 — 7 pliche
 * Uomo: petto + ascellare + tricipite + sottoscapolare + addome + soprailiaca + coscia
 * Donna: stessi siti, formula diversa
 */
export function jp7BodyDensity(
  sex: 'male' | 'female',
  skinfolds: {
    chest?: number
    midaxillary?: number
    tricep?: number
    subscapular?: number
    abdomen?: number
    suprailiac?: number
    thigh?: number
  },
  age: number
): number | null {
  const { chest, midaxillary, tricep, subscapular, abdomen, suprailiac, thigh } = skinfolds
  if (
    chest == null || midaxillary == null || tricep == null ||
    subscapular == null || abdomen == null || suprailiac == null || thigh == null
  ) return null

  const sum = chest + midaxillary + tricep + subscapular + abdomen + suprailiac + thigh

  if (sex === 'male') {
    return 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
  } else {
    return 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age
  }
}

/** Equazione di Siri: densità corporea → % grasso */
export function siriBodyFat(density: number): number {
  return (495 / density) - 450
}

// ─── Calcolo principale ───────────────────────────────────────────────────────

export interface BodyCompositionResult {
  body_fat_pct: number | null
  fat_mass_kg: number | null
  lean_mass_kg: number | null
}

/**
 * Calcola composizione corporea da una sessione di misurazione.
 * Prova JP7 prima, poi fallback JP3, poi null se i dati sono insufficienti.
 */
export function calcBodyComposition(
  input: CreateBodyMeasurementInput,
  profile: UserBodyProfile
): BodyCompositionResult {
  const age = calcAge(profile.birth_date)
  const sex = profile.sex

  const skinfolds = {
    chest: input.skinfold_chest,
    abdomen: input.skinfold_abdomen,
    thigh: input.skinfold_thigh,
    tricep: input.skinfold_tricep,
    suprailiac: input.skinfold_suprailiac,
    subscapular: input.skinfold_subscapular,
    midaxillary: input.skinfold_midaxillary,
  }

  const density =
    jp7BodyDensity(sex, skinfolds, age) ??
    jp3BodyDensity(sex, skinfolds, age)

  if (density == null || input.weight_kg == null) {
    // Se non abbiamo pliche complete, non possiamo calcolare % grasso
    // Ma se abbiamo solo peso salviamo comunque
    return { body_fat_pct: null, fat_mass_kg: null, lean_mass_kg: null }
  }

  const body_fat_pct = Math.max(0, Math.min(100, siriBodyFat(density)))
  const fat_mass_kg = (input.weight_kg * body_fat_pct) / 100
  const lean_mass_kg = input.weight_kg - fat_mass_kg

  return {
    body_fat_pct: Math.round(body_fat_pct * 10) / 10,
    fat_mass_kg: Math.round(fat_mass_kg * 10) / 10,
    lean_mass_kg: Math.round(lean_mass_kg * 10) / 10,
  }
}
