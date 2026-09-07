import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDatabase, initializeDatabase } from '../db'
import { cashRegisters, payments, products, saleItems, sales as salesTable } from '../db/schema'
import * as reports from './reports.service'
import type { PaymentInput } from '../../shared/types/sales.types'
import type { ReportResponse } from '../../shared/types/reports.types'

vi.mock('electron', () => ({ default: { app: { isPackaged: false, getPath: () => '/tmp' } } }))
const period = { startDate: '2026-09-01', endDate: '2026-09-30' }
let registerId: number
const data = <T>(result: ReportResponse<T>): T => {
  if (!result.success) throw new Error(result.error)
  return result.data
}
beforeEach(() => {
  initializeDatabase().exec('SAVEPOINT reports_test')
  registerId = getDatabase().insert(cashRegisters).values({ openedAt: '2026-09-05 12:00:00', openingAmountInCents: 1000 }).returning().get().id
})
afterEach(() => initializeDatabase().exec('ROLLBACK TO reports_test; RELEASE reports_test'))
const product = (name = 'Martelo') => getDatabase().insert(products).values({ name, internalCode: `P-${getDatabase().select().from(products).all().length}`, salePriceInCents: 100 }).returning().get()
const sale = (options: {
  at?: string; status?: 'paid' | 'open' | 'cancelled'; total?: number; discount?: number
  payments?: PaymentInput[]; items?: { productId: number; productName: string; quantity: number; totalInCents: number }[]
} = {}) => {
  const db = getDatabase()
  const total = options.total ?? 10000
  const saved = db.insert(salesTable).values({ cashRegisterId: registerId, createdAt: options.at ?? '2026-09-05 12:00:00', subtotalInCents: total + (options.discount ?? 0), discountInCents: options.discount ?? 0, totalInCents: total }).returning().get()
  for (const payment of options.payments ?? [{ method: 'cash', amountInCents: total }]) {
    db.insert(payments).values({ ...payment, saleId: saved.id }).run()
  }
  for (const item of options.items ?? []) db.insert(saleItems).values({ ...item, saleId: saved.id, unitPriceInCents: item.totalInCents }).run()
  db.update(salesTable).set({ status: options.status ?? 'paid' }).where(eq(salesTable.id, saved.id)).run()
  return saved
}

describe('sales reports', () => {
  it('selects complete sales without multiplying totals for repeated and mixed payments', () => {
    sale({ payments: [{ method: 'pix', amountInCents: 1000 }, { method: 'pix', amountInCents: 3000 }, { method: 'cash', amountInCents: 6000 }] })
    sale({ total: 500 })
    sale({ status: 'open' }); sale({ status: 'cancelled' })
    const result = data(reports.sales({ ...period, paymentMethod: 'pix' }))
    expect(result).toMatchObject({ saleCount: 1, totalSoldInCents: 10000, averageTicketInCents: 10000 })
    expect(result.totalsByPaymentMethod).toEqual([{ method: 'cash', totalInCents: 6000 }, { method: 'debit_card', totalInCents: 0 }, { method: 'credit_card', totalInCents: 0 }, { method: 'pix', totalInCents: 4000 }])
    expect(data(reports.sales(period))).toMatchObject({ saleCount: 2, totalSoldInCents: 10500, averageTicketInCents: 5250 })
  })
  it('includes free sales and returns zeros for empty periods', () => {
    sale({ total: 0, payments: [] }); sale({ total: 101 })
    expect(data(reports.sales(period))).toMatchObject({ saleCount: 2, totalSoldInCents: 101, averageTicketInCents: 51 })
    expect(data(reports.sales({ startDate: '2000-01-01', endDate: '2000-01-01' }))).toMatchObject({ saleCount: 0, totalSoldInCents: 0, averageTicketInCents: 0 })
  })
  it('includes local midnight through the end of the day with SQL and ISO timestamps', () => {
    const start = new Date('2026-09-10T00:00:00').getTime()
    const end = new Date('2026-09-11T00:00:00').getTime()
    sale({ at: new Date(start - 1000).toISOString() })
    sale({ at: new Date(start).toISOString().replace('T', ' ').replace('.000Z', '') })
    sale({ at: new Date(end - 1).toISOString() })
    sale({ at: new Date(end).toISOString() })
    expect(data(reports.sales({ startDate: '2026-09-10', endDate: '2026-09-10' })).saleCount).toBe(2)
  })
  it('rejects invalid dates, reversed ranges, unknown methods and malformed inputs', () => {
    for (const input of [null, {}, { ...period, startDate: '2026-02-30' }, { ...period, startDate: '2026-10-01' }, { ...period, paymentMethod: 'invalid' }, { ...period, endDate: 'today' }]) expect(reports.sales(input).success).toBe(false)
    expect(reports.sales({ startDate: '2024-02-29', endDate: '2024-02-29' }).success).toBe(true)
  })
})

describe('top product reports', () => {
  it('allocates cents, groups repeated products, retains the latest sold name and includes inactive products', () => {
    const a = product('A'), b = product('B')
    sale({ total: 199, discount: 1, items: [
      { productId: a.id, productName: 'Antigo', quantity: 0.5, totalInCents: 100 },
      { productId: b.id, productName: 'B', quantity: 1, totalInCents: 100 }
    ] })
    sale({ at: '2026-09-06T12:00:00Z', total: 100, items: [
      { productId: a.id, productName: 'Nome vendido', quantity: 0.25, totalInCents: 40 },
      { productId: a.id, productName: 'Nome vendido', quantity: 0.25, totalInCents: 60 }
    ] })
    getDatabase().update(products).set({ isActive: false, name: 'Nome posterior' }).where(eq(products.id, a.id)).run()
    expect(data(reports.topProducts(period))).toEqual([
      { productId: a.id, productName: 'Nome vendido', quantitySold: 1, totalSoldInCents: 199 },
      { productId: b.id, productName: 'B', quantitySold: 1, totalSoldInCents: 100 }
    ])
    expect(data(reports.topProducts(period)).reduce((sum, row) => sum + row.totalSoldInCents, 0)).toBe(data(reports.sales(period)).totalSoldInCents)
  })
  it('handles full discounts and zero subtotals; excludes unpaid and out-of-period sales', () => {
    const p = product()
    const item = { productId: p.id, productName: p.name, quantity: 1, totalInCents: 100 }
    sale({ total: 0, discount: 100, payments: [], items: [item] })
    sale({ total: 0, payments: [], items: [{ ...item, totalInCents: 0 }] })
    sale({ status: 'open', items: [item] }); sale({ status: 'cancelled', items: [item] })
    sale({ at: '2000-01-01 12:00:00', items: [item] })
    expect(data(reports.topProducts(period))).toEqual([{ productId: p.id, productName: p.name, quantitySold: 2, totalSoldInCents: 0 }])
    expect(data(reports.topProducts({ startDate: '1990-01-01', endDate: '1990-01-01' }))).toEqual([])
    expect(reports.topProducts({ ...period, paymentMethod: 'pix' }).success).toBe(false)
  })
})
