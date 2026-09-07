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
