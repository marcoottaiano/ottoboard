/**
 * Format a Date as "YYYY-MM-DD" using LOCAL time (not UTC).
 * Never use toISOString() for dates — in UTC+1, midnight local = 23:00 UTC
 * of the previous day, causing off-by-one bugs (documented in CLAUDE.md).
 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Return ISO weekday (1=Mon … 7=Sun) from a Date.
 * JS getDay() returns 0=Sun … 6=Sat.
 */
export function getIsoWeekday(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 7 : d
}
