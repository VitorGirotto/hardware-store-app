import type { Product } from '../../../../shared/types/product.types'
import type { PaymentMethod } from '../../../../shared/constants/sales.constants'
import type { SaleFinalizeInput } from '../../../../shared/types/sales.types'

export type CartItem = { product: Product; quantity: string; unitPrice: string; discount: string }
export type DraftPayment = { method: PaymentMethod; amount: string }
export type SalesDraft = { items: CartItem[]; customerId: string; discount: string; payments: DraftPayment[] }
export const emptySalesDraft = (): SalesDraft => ({ items: [], customerId: '', discount: '0,00', payments: [] })
export const moneyInput = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',')
export const formatMoney = (cents: number): string => Number.isFinite(cents)
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
  : '—'
export const parseMoney = (text: string): number => {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN
  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : NaN
}
export const parseQuantity = (text: string): number => {
  const normalized = text.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN
}
export const addProduct = (draft: SalesDraft, product: Product): SalesDraft => {
  const existing = draft.items.find((item) => item.product.id === product.id)
  return {
    ...draft,
    items: existing ? draft.items.map((item) => item.product.id === product.id
      ? { ...item, product, quantity: String((parseQuantity(item.quantity) || 0) + 1) }
      : item)
      : [...draft.items, { product, quantity: '1', unitPrice: moneyInput(product.salePriceInCents), discount: '0,00' }]
  }
}
export const draftToInput = (draft: SalesDraft, cashRegisterId: number): SaleFinalizeInput => ({
  cashRegisterId,
  customerId: draft.customerId ? Number(draft.customerId) : null,
  discountInCents: parseMoney(draft.discount),
  items: draft.items.map((item) => ({
    productId: item.product.id, quantity: parseQuantity(item.quantity),
    unitPriceInCents: parseMoney(item.unitPrice), discountInCents: parseMoney(item.discount)
  })),
  payments: draft.payments.map((payment) => ({ method: payment.method, amountInCents: parseMoney(payment.amount) }))
})
export const fieldClass = 'h-10 w-full rounded border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400 disabled:opacity-50'
export const buttonClass = 'rounded border border-slate-600 px-3 py-2 text-sm font-medium hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50'
