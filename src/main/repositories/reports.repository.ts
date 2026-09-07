import { and, eq, sql } from 'drizzle-orm'
import { PAYMENT_METHODS } from '../../shared/constants/sales.constants'
import { reportBounds } from '../../shared/schemas/reports.schema'
import type { SalesReport, SalesReportFilters } from '../../shared/types/reports.types'
import { getDatabase } from '../db'
import { payments, sales } from '../db/schema'

const salesConditions = (filters: SalesReportFilters) => {
  const bounds = reportBounds(filters)
  return and(
    eq(sales.status, 'paid'),
    sql`julianday(${sales.createdAt}) >= julianday(${bounds.start})`,
    sql`julianday(${sales.createdAt}) < julianday(${bounds.end})`,
    filters.paymentMethod ? sql`exists (select 1 from payments p where p.sale_id = ${sales.id} and p.method = ${filters.paymentMethod})` : undefined
  )
}

export const salesReport = (filters: SalesReportFilters): SalesReport => {
  const db = getDatabase()
  return db.transaction((tx) => {
    const totals = tx.select({ saleCount: sql<number>`count(*)`, totalSoldInCents: sql<number>`coalesce(sum(${sales.totalInCents}), 0)` })
      .from(sales).where(salesConditions(filters)).get()!
    const byMethod = tx.select({ method: payments.method, totalInCents: sql<number>`sum(${payments.amountInCents})` })
      .from(payments).innerJoin(sales, eq(payments.saleId, sales.id)).where(salesConditions(filters)).groupBy(payments.method).all()
    return {
      ...totals,
      averageTicketInCents: totals.saleCount ? Math.round(totals.totalSoldInCents / totals.saleCount) : 0,
      totalsByPaymentMethod: PAYMENT_METHODS.map((method) => ({ method, totalInCents: byMethod.find((row) => row.method === method)?.totalInCents ?? 0 }))
    }
  })
}
