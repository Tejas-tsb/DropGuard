export const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
export const integerFormat = new Intl.NumberFormat('en-US')

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}

export function humanize(value: string | number | null): string {
  if (value === null) return 'Not recorded'
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}
