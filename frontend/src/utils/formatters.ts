const GNF = new Intl.NumberFormat('fr-GN', {
  style: 'currency',
  currency: 'GNF',
  maximumFractionDigits: 0,
})

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

const XOF = new Intl.NumberFormat('fr-SN', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
})

const FORMATTERS: Record<string, Intl.NumberFormat> = { GNF, EUR, USD, GBP, XOF }

export function formatAmount(amount: string | number, devise: string): string {
  const formatter = FORMATTERS[devise] ?? GNF
  return formatter.format(Number(amount))
}

export function formatGNF(amount: string | number): string {
  return GNF.format(Number(amount))
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('fr-GN', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function truncateHash(hash: string | null | undefined, chars = 8): string {
  if (!hash) return '—'
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`
}
