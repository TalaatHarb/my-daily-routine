/** Small, predictable palette for categories and tags (kept in sync with the API's ColorPalette). */
export const LABEL_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
] as const

export function normalizeLabel(name: string): string {
  return name.trim().toLowerCase()
}

/** FNV-1a 32-bit hash over the UTF-8 bytes of the text. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** Color the API assigns automatically to a new label with this name. */
export function autoLabelColor(name: string): string {
  return LABEL_PALETTE[fnv1a(normalizeLabel(name)) % LABEL_PALETTE.length]
}

/** Picks black or white text for readable contrast on the given background. */
export function readableTextColor(hex: string): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#111827' : '#ffffff'
}
