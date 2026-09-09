import type { PaymentMethod, SALE_STATUSES } from '../constants/sales.constants'

export type SaleItemInput = {
  productId: number
  quantity: number
  unitPriceInCents: number
  discountInCents: number
}
export type PaymentInput = { method: PaymentMethod; amountInCents: number; receivedAmountInCents?: number }
export type SaleFinalizeInput = {
  cashRegisterId: number
  customerId?: number | null
  items: SaleItemInput[]
  discountInCents: number
  payments: PaymentInput[]
}
export type SaleItem = SaleItemInput & {
  id: number
  saleId: number
  productName: string
  totalInCents: number
}
export type Payment = Omit<PaymentInput, 'receivedAmountInCents'> & { receivedAmountInCents?: number | null; id: number; saleId: number; paidAt: string }
export type Sale = {
  id: number
  customerId: number | null
  cashRegisterId: number
  subtotalInCents: number
  discountInCents: number
  totalInCents: number
  status: (typeof SALE_STATUSES)[number]
  createdAt: string
  items: SaleItem[]
  payments: Payment[]
}
export type SaleServiceResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: string[] }
