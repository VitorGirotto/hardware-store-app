type DiscountItem = { id: number; totalInCents: number }

// BigInt preserves exact remainders even when cents * discount exceeds JS safe integers.
export const allocateSaleDiscount = (items: DiscountItem[], discountInCents: number): Map<number, number> => {
  const subtotal = items.reduce((sum, item) => sum + BigInt(item.totalInCents), 0n)
  if (subtotal === 0n) return new Map(items.map((item) => [item.id, 0]))
  const discount = BigInt(discountInCents)
  const allocations = items.map((item) => {
    const weighted = BigInt(item.totalInCents) * discount
    return { ...item, discount: weighted / subtotal, remainder: weighted % subtotal }
  })
  const remainder = Number(discount - allocations.reduce((sum, item) => sum + item.discount, 0n))
  allocations.sort((a, b) => a.remainder === b.remainder ? a.id - b.id : a.remainder > b.remainder ? -1 : 1)
  return new Map(allocations.map((item, index) => [item.id, item.totalInCents - Number(item.discount) - (index < remainder ? 1 : 0)]))
}
