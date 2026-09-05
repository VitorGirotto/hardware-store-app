import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDatabase, initializeDatabase } from '../db'
import { cashRegisters, customers, payments, products, saleItems, sales, stockMovements } from '../db/schema'
import { finalizeSale } from './sales.service'
import { getCurrentCashRegisterSummary, closeCashRegister } from './cash-register.service'
import { listProducts } from '../repositories/product.repository'
import type { SaleFinalizeInput } from '../../shared/types/sales.types'

vi.mock('electron', () => ({ default: { app: { isPackaged: false, getPath: () => '/tmp' } } }))
let input: SaleFinalizeInput
let sequence = 0
beforeEach(() => {
  const db = getDatabase()
  sequence++
  const register = db.insert(cashRegisters).values({ openingAmountInCents: 1000 }).returning().get()
  const product = db.insert(products).values({ name: 'Martelo', internalCode: `SALE-${sequence}`, barcode: `BAR-${sequence}`, category: 'Ferragens', salePriceInCents: 100, stockQuantity: 10 }).returning().get()
  input = { cashRegisterId: register.id, discountInCents: 10, items: [{ productId: product.id, quantity: 2, unitPriceInCents: 100, discountInCents: 20 }], payments: [{ method: 'cash', amountInCents: 70 }, { method: 'pix', amountInCents: 100 }] }
})
afterEach(() => {
  expect(closeCashRegister({ cashRegisterId: input.cashRegisterId, closingAmountInCents: 1000 }).success).toBe(true)
})
const snapshot = () => {
  const db = getDatabase()
  return { sales: db.select().from(sales).all(), items: db.select().from(saleItems).all(), payments: db.select().from(payments).all(), products: db.select().from(products).all(), movements: db.select().from(stockMovements).all() }
}
const expectRejectedWithoutWrites = (value: unknown) => {
  const before = snapshot()
  expect(finalizeSale(value).success).toBe(false)
  expect(snapshot()).toEqual(before)
}

describe('atomic sale finalization', () => {
  it('persists discounts, current product name, payments, stock movement and cash summary', () => {
    const db = getDatabase()
    const customer = db.insert(customers).values({ name: 'Cliente' }).returning().get()
    db.update(products).set({ name: 'Nome no momento da venda' }).where(eq(products.id, input.items[0].productId)).run()
    const result = finalizeSale({ ...input, customerId: customer.id })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.error)
    expect(result.data).toMatchObject({ status: 'paid', customerId: customer.id, subtotalInCents: 180, discountInCents: 10, totalInCents: 170 })
    expect(result.data.items[0]).toMatchObject({ productName: 'Nome no momento da venda', totalInCents: 180 })
    expect(result.data.payments).toHaveLength(2)
    expect(db.select().from(products).where(eq(products.id, input.items[0].productId)).get()?.stockQuantity).toBe(8)
    expect(db.select().from(stockMovements).where(eq(stockMovements.reference, `sale:${result.data.id}`)).all()).toMatchObject([{ quantity: -2, type: 'sale_exit' }])
    expect(getCurrentCashRegisterSummary()).toMatchObject({ success: true, data: { totalSoldInCents: 170, cashPaymentsInCents: 70, expectedCashInCents: 1070 } })
    db.update(products).set({ name: 'Nome posterior' }).where(eq(products.id, input.items[0].productId)).run()
    expect(db.select().from(saleItems).where(eq(saleItems.saleId, result.data.id)).get()?.productName).toBe('Nome no momento da venda')
  })
  it('supports free sales and fractional quantities', () => {
    const result = finalizeSale({ ...input, items: [{ ...input.items[0], quantity: 0.5, unitPriceInCents: 0, discountInCents: 0 }], discountInCents: 0, payments: [] })
    expect(result).toMatchObject({ success: true, data: { totalInCents: 0, payments: [] } })
    expect(getDatabase().select().from(products).where(eq(products.id, input.items[0].productId)).get()?.stockQuantity).toBe(9.5)
  })
  it('consumes fractional stock without rejecting binary rounding residue', () => {
    const db = getDatabase()
    db.update(products).set({ stockQuantity: 0.3 }).where(eq(products.id, input.items[0].productId)).run()
    for (const quantity of [0.1, 0.2]) {
      expect(finalizeSale({ ...input, items: [{ ...input.items[0], quantity, unitPriceInCents: 0, discountInCents: 0 }], discountInCents: 0, payments: [] }).success).toBe(true)
    }
    expect(db.select().from(products).where(eq(products.id, input.items[0].productId)).get()?.stockQuantity).toBe(0)
    expectRejectedWithoutWrites({ ...input, items: [{ ...input.items[0], quantity: 0.000001, unitPriceInCents: 0, discountInCents: 0 }], discountInCents: 0, payments: [] })
  })
  it('aggregates repeated products for stock checks and one movement', () => {
    const item = { ...input.items[0], quantity: 6, unitPriceInCents: 0, discountInCents: 0 }
    expectRejectedWithoutWrites({ ...input, items: [item, item], discountInCents: 0, payments: [] })
    item.quantity = 2
    const result = finalizeSale({ ...input, items: [item, item], discountInCents: 0, payments: [] })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.error)
    expect(getDatabase().select().from(stockMovements).where(eq(stockMovements.reference, `sale:${result.data.id}`)).all()).toMatchObject([{ quantity: -4 }])
  })
  it('rejects inactive or missing products and customers', () => {
    expectRejectedWithoutWrites({ ...input, customerId: 999999 })
    const db = getDatabase()
    const inactive = db.insert(customers).values({ name: 'Inativo', isActive: false }).returning().get()
    expectRejectedWithoutWrites({ ...input, customerId: inactive.id })
    expectRejectedWithoutWrites({ ...input, items: [{ ...input.items[0], productId: 999999 }] })
    db.update(products).set({ isActive: false }).where(eq(products.id, input.items[0].productId)).run()
    expectRejectedWithoutWrites(input)
  })
  it('rejects a closed or stale cash register even when another register is open', () => {
    const previous = input.cashRegisterId
    expect(closeCashRegister({ cashRegisterId: previous, closingAmountInCents: 1000 }).success).toBe(true)
    expectRejectedWithoutWrites(input)
    input.cashRegisterId = getDatabase().insert(cashRegisters).values({}).returning().get().id
    expectRejectedWithoutWrites({ ...input, cashRegisterId: previous })
    expectRejectedWithoutWrites({ ...input, cashRegisterId: 999999 })
  })
  it('rolls back every write if the second stock update fails', () => {
    const db = getDatabase()
    const second = db.insert(products).values({ name: 'Segundo', internalCode: 'ROLLBACK', salePriceInCents: 0, stockQuantity: 5 }).returning().get()
    const sqlite = initializeDatabase()
    sqlite.exec(`CREATE TEMP TRIGGER fail_second_stock BEFORE UPDATE OF stock_quantity ON products WHEN NEW.id = ${second.id} BEGIN SELECT RAISE(ABORT, 'TEST_STOCK_FAILURE'); END;`)
    try {
      expectRejectedWithoutWrites({ ...input, items: [...input.items, { productId: second.id, quantity: 1, unitPriceInCents: 0, discountInCents: 0 }] })
      expect(getCurrentCashRegisterSummary()).toMatchObject({ success: true, data: { totalSoldInCents: 0, expectedCashInCents: 1000 } })
    } finally {
      sqlite.exec('DROP TRIGGER fail_second_stock')
    }
  })
  it('rejects invalid items and payments before persistence', () => {
    for (const override of [{ items: [] }, { payments: [] }, { payments: [{ method: 'pix', amountInCents: 171 }] }, { items: [{ ...input.items[0], quantity: 0 }] }, { items: [{ ...input.items[0], unitPriceInCents: -1 }] }]) {
      expectRejectedWithoutWrites({ ...input, ...override })
    }
  })
  it('searches by name, internal code, barcode and category, excluding inactive products', () => {
    for (const query of ['Martelo', `SALE-${sequence}`, `BAR-${sequence}`, 'Ferragens']) {
      expect(listProducts({ query }).some((p) => p.id === input.items[0].productId)).toBe(true)
    }
    getDatabase().update(products).set({ isActive: false }).where(eq(products.id, input.items[0].productId)).run()
    expect(listProducts({ query: `SALE-${sequence}` })).toEqual([])
  })
})
