import type { TimeSlot } from '@/types/travel'

export const TIME_SLOTS_ORDER: TimeSlot[] = [
  'colazione', 'mattina', 'pranzo', 'pomeriggio', 'cena', 'sera',
]

export const SLOT_LABEL: Record<TimeSlot, string> = {
  colazione: 'Colazione',
  mattina: 'Mattina',
  pranzo: 'Pranzo',
  pomeriggio: 'Pomeriggio',
  cena: 'Cena',
  sera: 'Sera',
}
