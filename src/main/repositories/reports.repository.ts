import { listLowStock } from './inventory.repository'
import { allocateSaleDiscount } from '../../shared/utils/reports'
import { and, desc, eq, sql } from 'drizzle-orm'
import { PAYMENT_METHODS } from '../../shared/constants/sales.constants'
import { reportBounds } from '../../shared/schemas/reports.schema'
import type { CashRegisterReportRow, LowStockReportRow, ReportPeriod, TopProductReportRow, SalesReport, SalesReportFilters } from '../../shared/types/reports.types'
import { getDatabase } from '../db'
import { cashRegisters, payments, saleItems, sales } from '../db/schema'

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

export const lowStockReport = (): LowStockReportRow[] => listLowStock().map((product) => ({
  productId: product.id,
  productName: product.name,
  unitOfMeasure: product.unitOfMeasure,
  stockQuantity: product.stockQuantity,
  minimumStockQuantity: product.minimumStockQuantity,
  missingQuantity: product.minimumStockQuantity - product.stockQuantity
}))

export const cashRegistersReport = (period: ReportPeriod): CashRegisterReportRow[] => {
  const db = getDatabase()
  const bounds = reportBounds(period)
  const sold = db.select({ registerId: sales.cashRegisterId, total: sql<number>`sum(${sales.totalInCents})`.as('sold_total') })
    .from(sales).where(eq(sales.status, 'paid')).groupBy(sales.cashRegisterId).as('sold')
  const cash = db.select({ registerId: sales.cashRegisterId, total: sql<number>`sum(${payments.amountInCents})`.as('cash_total') })
    .from(payments).innerJoin(sales, eq(payments.saleId, sales.id))
    .where(and(eq(sales.status, 'paid'), eq(payments.method, 'cash'))).groupBy(sales.cashRegisterId).as('cash')
  return db.select({
    id: cashRegisters.id,
    openedAt: cashRegisters.openedAt,
    closedAt: sql<string | null>`case when ${cashRegisters.status} = 'closed' then ${cashRegisters.closedAt} end`,
    openingAmountInCents: cashRegisters.openingAmountInCents,
    totalSoldInCents: sql<number>`coalesce(${sold.total}, 0)`,
    expectedCashInCents: sql<number>`${cashRegisters.openingAmountInCents} + coalesce(${cash.total}, 0)`,
    closingAmountInCents: sql<number | null>`case when ${cashRegisters.status} = 'closed' then ${cashRegisters.closingAmountInCents} end`,
    differenceInCents: sql<number | null>`case when ${cashRegisters.status} = 'closed' then ${cashRegisters.differenceInCents} end`
  }).from(cashRegisters)
    .leftJoin(sold, eq(sold.registerId, cashRegisters.id)).leftJoin(cash, eq(cash.registerId, cashRegisters.id))
    .where(and(sql`julianday(${cashRegisters.openedAt}) >= julianday(${bounds.start})`, sql`julianday(${cashRegisters.openedAt}) < julianday(${bounds.end})`))
    .orderBy(desc(sql`julianday(${cashRegisters.openedAt})`), desc(cashRegisters.id)).all()
}
