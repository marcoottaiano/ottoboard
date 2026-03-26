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

/**
 * Return a new Date set to the most recent Monday at local midnight.
 * If today is Monday, returns today at 00:00.
 */
export function getCurrentMonday(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const iso = getIsoWeekday(d)  // 1=Mon … 7=Sun
  d.setDate(d.getDate() - (iso - 1))
  return d
}

/**
 * Return the start (Monday 00:00) and end (Sunday 23:59:59.999) of the
 * previous ISO week relative to `from` (defaults to today).
 */
export function getPreviousWeekBounds(from: Date = new Date()): { start: Date; end: Date } {
  const monday = getCurrentMonday(from)
  monday.setDate(monday.getDate() - 7)           // previous Monday
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}
