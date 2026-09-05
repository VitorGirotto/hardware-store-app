import type { PaymentInput, SaleItemInput } from '../types/sales.types'

const assertMoney = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Informe um valor não negativo em centavos, dentro do limite permitido.')
  }
  return value
}

// Round each line once, before discounts, for the same preview and persisted totals.
export const calculateSaleTotals = (items: SaleItemInput[], discountInCents: number) => {
  if (items.length === 0) throw new Error('A venda precisa ter pelo menos um item.')
  assertMoney(discountInCents)
  const calculatedItems = items.map((item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error('A quantidade deve ser maior que zero.')
    }
    assertMoney(item.unitPriceInCents)
    assertMoney(item.discountInCents)
    const grossInCents = assertMoney(Math.round(item.quantity * item.unitPriceInCents))
    if (item.discountInCents > grossInCents) throw new Error('O desconto do item supera seu valor.')
    return { ...item, totalInCents: grossInCents - item.discountInCents }
  })
  const subtotalInCents = calculatedItems.reduce((sum, item) => assertMoney(sum + item.totalInCents), 0)
  if (discountInCents > subtotalInCents) throw new Error('O desconto da venda supera o subtotal.')
  return { items: calculatedItems, subtotalInCents, discountInCents, totalInCents: subtotalInCents - discountInCents }
}

export const validateSalePayments = (payments: PaymentInput[], totalInCents: number): void => {
  assertMoney(totalInCents)
  const paid = payments.reduce((sum, payment) => {
    assertMoney(payment.amountInCents)
    if (payment.amountInCents === 0) throw new Error('O pagamento deve ser maior que zero.')
    return assertMoney(sum + payment.amountInCents)
  }, 0)
  if (paid !== totalInCents) throw new Error('A soma dos pagamentos deve ser igual ao total da venda.')
}
