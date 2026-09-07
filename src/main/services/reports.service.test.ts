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
