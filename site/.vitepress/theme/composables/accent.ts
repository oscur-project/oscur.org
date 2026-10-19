import type { SoftwareSummary } from '../node/software'

// Inline CSS variables that give a software card or row its topic's accent (see .oscur-accent in styles/vars.css).
// They are part of the prerendered HTML, so the colors are right before any script runs.
export function accentStyle(item: Pick<SoftwareSummary, 'accent' | 'accentLight' | 'accentDark'>) {
  return {
    '--p-raw': item.accent,
    '--p-light': item.accentLight,
    '--p-dark': item.accentDark,
  }
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
