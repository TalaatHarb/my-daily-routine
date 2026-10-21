import { describe, expect, it } from 'vitest'
import { LABEL_PALETTE, autoLabelColor, fnv1a, normalizeLabel, readableTextColor } from './colors'

describe('fnv1a', () => {
  it('matches the reference FNV-1a 32-bit test vectors (same as the API)', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('hashes UTF-8 bytes so Arabic names are stable', () => {
    expect(fnv1a('عمل')).toBe(fnv1a('عمل'))
    expect(fnv1a('عمل')).not.toBe(fnv1a('work'))
  })
})

describe('autoLabelColor', () => {
  it('is case and whitespace insensitive', () => {
    expect(autoLabelColor('  Work ')).toBe(autoLabelColor('work'))
  })

  it('always returns a palette color', () => {
    for (const name of ['work', 'health', 'family', 'عمل', 'x']) {
      expect(LABEL_PALETTE).toContain(autoLabelColor(name))
    }
  })

  it('uses unsigned modulo over the palette', () => {
    expect(autoLabelColor('foobar')).toBe(LABEL_PALETTE[0xbf9cf968 % LABEL_PALETTE.length])
  })
})

describe('helpers', () => {
  it('normalizes labels', () => {
    expect(normalizeLabel('  Deep Work ')).toBe('deep work')
  })

  it('picks readable text colors', () => {
    expect(readableTextColor('#ffffff')).toBe('#111827')
    expect(readableTextColor('#1e1b4b')).toBe('#ffffff')
  })
})
