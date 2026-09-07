import type { PaymentMethod } from '../constants/sales.constants'

export type ReportPeriod = { startDate: string; endDate: string }
export type SalesReportFilters = ReportPeriod & { paymentMethod?: PaymentMethod }
export type ReportResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: string[] }
export type SalesReport = {
  saleCount: number
  totalSoldInCents: number
  averageTicketInCents: number
  totalsByPaymentMethod: { method: PaymentMethod; totalInCents: number }[]
}
export type TopProductReportRow = {
  productId: number
  productName: string
  quantitySold: number
  totalSoldInCents: number
}
export type LowStockReportRow = {
  productId: number
  productName: string
  unitOfMeasure: string
  stockQuantity: number
  minimumStockQuantity: number
  missingQuantity: number
}
export type CashRegisterReportRow = {
  id: number
  openedAt: string
  closedAt: string | null
  openingAmountInCents: number
  totalSoldInCents: number
  expectedCashInCents: number
  closingAmountInCents: number | null
  differenceInCents: number | null
}
