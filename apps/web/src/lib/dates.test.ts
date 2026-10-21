import { describe, expect, it } from 'vitest'
import { addDays, diffInDays, isIsoDate, nextWeekStart, parseIsoDate, toIsoDate, todayIso } from './dates'

describe('dates', () => {
  it('round-trips ISO dates using the local calendar', () => {
    expect(toIsoDate(parseIsoDate('2025-03-09'))).toBe('2025-03-09')
    expect(todayIso(new Date(2025, 0, 5, 23, 59))).toBe('2025-01-05')
  })

  it('validates ISO dates', () => {
    expect(isIsoDate('2025-02-28')).toBe(true)
    expect(isIsoDate('2025-02-30')).toBe(false)
    expect(isIsoDate('2025-2-3')).toBe(false)
    expect(isIsoDate(undefined)).toBe(false)
  })

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01')
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
    expect(addDays('2025-03-30', 1)).toBe('2025-03-31')
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28')
  })

  it('finds the next Monday strictly after a day', () => {
    expect(nextWeekStart('2025-06-11')).toBe('2025-06-16') // Wednesday
    expect(nextWeekStart('2025-06-15')).toBe('2025-06-16') // Sunday
    expect(nextWeekStart('2025-06-16')).toBe('2025-06-23') // Monday
  })

  it('computes whole-day differences', () => {
    expect(diffInDays('2025-03-29', '2025-04-02')).toBe(4)
    expect(diffInDays('2025-04-02', '2025-03-29')).toBe(-4)
  })
})
