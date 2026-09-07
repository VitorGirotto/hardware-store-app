import { allocateSaleDiscount } from '../../shared/utils/reports'
import { and, desc, eq, sql } from 'drizzle-orm'
import { PAYMENT_METHODS } from '../../shared/constants/sales.constants'
import { reportBounds } from '../../shared/schemas/reports.schema'
import type { ReportPeriod, TopProductReportRow, SalesReport, SalesReportFilters } from '../../shared/types/reports.types'
import { getDatabase } from '../db'
import { payments, saleItems, sales } from '../db/schema'

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

export const topProductsReport = (period: ReportPeriod): TopProductReportRow[] => {
  const rows = getDatabase().select({ item: saleItems, discountInCents: sales.discountInCents })
    .from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(salesConditions(period))
    .orderBy(desc(sql`julianday(${sales.createdAt})`), desc(sales.id), desc(saleItems.id)).all()
  const bySale = new Map<number, typeof rows>()
  for (const row of rows) {
    const group = bySale.get(row.item.saleId) ?? []
    group.push(row)
    bySale.set(row.item.saleId, group)
  }
  const byProduct = new Map<number, TopProductReportRow>()
  for (const group of bySale.values()) {
    const net = allocateSaleDiscount(group.map((row) => row.item), group[0].discountInCents)
    for (const { item } of group) {
      const product = byProduct.get(item.productId) ?? { productId: item.productId, productName: item.productName, quantitySold: 0, totalSoldInCents: 0 }
      product.quantitySold += item.quantity
      product.totalSoldInCents += net.get(item.id)!
      byProduct.set(item.productId, product)
    }
  }
  return [...byProduct.values()].sort((a, b) => b.quantitySold - a.quantitySold || b.totalSoldInCents - a.totalSoldInCents || a.productId - b.productId)
}
