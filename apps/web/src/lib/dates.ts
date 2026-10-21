/** Date helpers working with local calendar days in ISO `YYYY-MM-DD` form. */

const pad = (value: number) => String(value).padStart(2, '0')

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isIsoDate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toIsoDate(parseIsoDate(value)) === value
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now)
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

/** Next Monday strictly after the given day. */
export function nextWeekStart(value: string): string {
  const date = parseIsoDate(value)
  const daysUntilMonday = ((8 - date.getDay()) % 7) || 7
  return addDays(value, daysUntilMonday)
}

export function diffInDays(from: string, to: string): number {
  const msPerDay = 86_400_000
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / msPerDay)
}

export function formatDayTitle(value: string, locale: string, today = todayIso()): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseIsoDate(value),
  ) + (value.slice(0, 4) !== today.slice(0, 4) ? ` ${value.slice(0, 4)}` : '')
}

export function formatShortDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    parseIsoDate(value),
  )
}

/** Formats `HH:mm` according to the locale's time conventions. */
export function formatTime(value: string, locale: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}
