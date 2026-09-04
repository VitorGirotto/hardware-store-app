export const formatMoney = (valueInCents: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valueInCents / 100)

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))

export const parseMoneyInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')

  if (!normalized) {
    return 0
  }

  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}
