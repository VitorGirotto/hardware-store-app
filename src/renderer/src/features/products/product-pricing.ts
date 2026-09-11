export type ProductPricing = {
  costPrice: string
  salePrice: string
  markupPercentage: string
}

export const parsePricingDecimal = (input: string): number | null => {
  const normalized = input.trim().replace(',', '.')
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export const parsePriceInCents = (input: string): number | null => {
  const value = parsePricingDecimal(input)
  if (value === null || value < 0) return null
  const cents = Math.round((value + Number.EPSILON) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

export const calculateSalePrice = (costInCents: number, markup: number): number | null => {
  const cents = Math.round(costInCents * (100 + markup) / 100)
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null
}

export const calculateMarkup = (costInCents: number, saleInCents: number): number | null => {
  if (costInCents <= 0) return null
  return Math.round(((saleInCents / costInCents - 1) * 100 + Number.EPSILON) * 100) / 100
}

export const updateProductPricing = (
  current: ProductPricing,
  field: keyof ProductPricing,
  value: string
): ProductPricing => {
  const next = { ...current, [field]: value }
  const cost = parsePriceInCents(next.costPrice)
  if (cost === null) return next

  if (field === 'salePrice') {
    const sale = parsePriceInCents(value)
    if (sale !== null) {
      const markup = calculateMarkup(cost, sale)
      next.markupPercentage = markup === null ? '' : markup.toFixed(2)
    }
  } else if (next.markupPercentage.trim()) {
    const markup = parsePricingDecimal(next.markupPercentage)
    if (markup !== null && markup >= -100) {
      const sale = calculateSalePrice(cost, markup)
      if (sale !== null) next.salePrice = (sale / 100).toFixed(2)
    }
  }
  return next
}
