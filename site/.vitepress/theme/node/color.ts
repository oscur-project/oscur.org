import { clampChroma, converter, formatHex, interpolate, parse, wcagContrast } from 'culori'

const toOklch = converter('oklch')

// Background colors of the VitePress default theme, which every accent is checked against.
export const LIGHT_BG = '#ffffff'
export const DARK_BG = '#1b1b1f'

// `amount` of color `a` mixed into `b`, in OKLab.
export function mix(a: string, b: string, amount: number): string {
  return formatHex(interpolate([b, a], 'oklab')(amount))
}

export function contrast(a: string, b: string): number {
  return wcagContrast(a, b)
}

// Moves the OKLCH lightness of `color` away from `bg` until the two reach `ratio`.
// Hue and chroma are kept, so the result still reads as the same color.
export function ensureContrast(color: string, bg: string, ratio = 4.5): string {
  const start = toOklch(parse(color))
  if (!start) throw new Error(`not a color: ${color}`)
  const step = contrast(bg, '#000000') > contrast(bg, '#ffffff') ? -0.005 : 0.005
  let current = start
  let hex = formatHex(clampChroma(current, 'oklch'))
  for (let i = 0; i < 200 && contrast(hex, bg) < ratio; i++) {
    current = { ...current, l: Math.min(1, Math.max(0, current.l + step)) }
    hex = formatHex(clampChroma(current, 'oklch'))
  }
  return hex
}

export interface Accent {
  // The color as given, for decoration only (dots, stripes, soft tints).
  accent: string
  // Readable as text on white, and white text on it is readable: light-mode links and buttons.
  accentLight: string
  // Readable as text on the dark background: dark-mode links.
  accentDark: string
}

// Above the 4.5:1 minimum on purpose: the accent also sits on its own soft tint (badges, active
// filters), which lowers the contrast it has against the plain page background.
export const LIGHT_TARGET = 6
export const DARK_TARGET = 7

export function deriveAccent(accent: string): Accent {
  return {
    accent,
    accentLight: ensureContrast(accent, LIGHT_BG, LIGHT_TARGET),
    accentDark: ensureContrast(accent, DARK_BG, DARK_TARGET),
  }
}
