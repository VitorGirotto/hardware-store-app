import { afterEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import type {
  CashRegister,
  CashRegisterServiceResponse,
  CashRegisterSummary
} from '../../shared/types/cash-register.types'
import { getDatabase, initializeDatabase } from '../db'
import { cashRegisters, payments, products, saleItems, sales } from '../db/schema'
import {
  calculateDifference,
  calculateExpectedCash,
  closeCashRegister,
  getCurrentCashRegisterSummary,
  getOpenCashRegister,
  listPreviousCashRegisters,
  openCashRegister
} from './cash-register.service'

vi.mock('electron', () => ({
  default: {
    app: {
      isPackaged: false,
      getPath: () => '/tmp'
    }
  },
  app: {
    isPackaged: false,
    getPath: () => '/tmp'
  }
}))

const expectSuccess = <T>(result: CashRegisterServiceResponse<T>): T => {
  expect(result.success).toBe(true)

  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data
}

const expectFailure = <T>(result: CashRegisterServiceResponse<T>): string => {
  expect(result.success).toBe(false)

  if (result.success) {
    throw new Error('Expected failure response.')
  }

  return result.error
}

const open = (openingAmountInCents = 0): CashRegister =>
  expectSuccess(openCashRegister({ openingAmountInCents }))

afterEach(() => {
  const current = expectSuccess(getOpenCashRegister())

  if (!current) {
    return
  }

  const db = getDatabase()
  db.update(sales)
    .set({ status: 'cancelled' })
    .where(and(eq(sales.cashRegisterId, current.id), eq(sales.status, 'open')))
    .run()
  expectSuccess(
    closeCashRegister({
      cashRegisterId: current.id,
      closingAmountInCents: current.openingAmountInCents
    })
  )
})

describe('cash register service', () => {
  it('opens a cash register with zero and returns it as current', () => {
    const created = open(0)
    const current = expectSuccess(getOpenCashRegister())

    expect(current?.id).toBe(created.id)
    expect(current?.status).toBe('open')
    expect(current?.differenceInCents).toBeNull()
  })

  it('rejects negative opening amounts and a second open cash register', () => {
    expect(expectFailure(openCashRegister({ openingAmountInCents: -1 }))).toBe(
      'Dados do caixa invalidos.'
    )
    open(100)
    expect(expectFailure(openCashRegister({ openingAmountInCents: 200 }))).toBe(
      'Ja existe um caixa aberto.'
    )
  })

  it('returns null when there is no open cash register', () => {
    expect(expectSuccess(getOpenCashRegister())).toBeNull()
    expect(expectSuccess(getCurrentCashRegisterSummary())).toBeNull()
  })

  it('rejects missing and already closed cash registers', () => {
    expect(
      expectFailure(
        closeCashRegister({
          cashRegisterId: 999999,
          closingAmountInCents: 0
        })
      )
    ).toBe('Caixa nao encontrado.')

    const cashRegister = open(100)
    expectSuccess(
      closeCashRegister({
        cashRegisterId: cashRegister.id,
        closingAmountInCents: 100
      })
    )
    expect(
      expectFailure(
        closeCashRegister({
          cashRegisterId: cashRegister.id,
          closingAmountInCents: 100
        })
      )
    ).toBe('Este caixa ja esta fechado.')
  })

  it('blocks closing while the cash register has an open sale', () => {
    const cashRegister = open()
    const db = getDatabase()

    db.insert(sales)
      .values({
        cashRegisterId: cashRegister.id,
        subtotalInCents: 500,
        totalInCents: 500,
        status: 'open'
      })
      .run()

    expect(
      expectFailure(
        closeCashRegister({
          cashRegisterId: cashRegister.id,
          closingAmountInCents: 0
        })
      )
    ).toBe('Existem vendas abertas vinculadas a este caixa.')
  })

  it('calculates paid sales, expected cash and the closing difference', () => {
    const cashRegister = open(10000)
    const db = getDatabase()
    const paidSale = db
      .insert(sales)
      .values({
        cashRegisterId: cashRegister.id,
        subtotalInCents: 12000,
        totalInCents: 12000,
        status: 'open'
      })
      .returning()
      .get()
    const cancelledSale = db
      .insert(sales)
      .values({
        cashRegisterId: cashRegister.id,
        subtotalInCents: 9000,
        totalInCents: 9000,
        status: 'cancelled'
      })
      .returning()
      .get()

    db.insert(payments)
      .values([
        { saleId: paidSale.id, method: 'cash', amountInCents: 5000 },
        { saleId: paidSale.id, method: 'pix', amountInCents: 7000 },
        { saleId: cancelledSale.id, method: 'cash', amountInCents: 9000 }
      ])
      .run()

    db.update(sales).set({ status: 'paid' }).where(eq(sales.id, paidSale.id)).run()

    const current = expectSuccess(getCurrentCashRegisterSummary()) as CashRegisterSummary
    expect(current.totalSoldInCents).toBe(12000)
    expect(current.cashPaymentsInCents).toBe(5000)
    expect(current.expectedCashInCents).toBe(15000)

    const closed = expectSuccess(
      closeCashRegister({
        cashRegisterId: cashRegister.id,
        closingAmountInCents: 14500,
        notes: '  Contagem revisada  '
      })
    )

    expect(closed.cashRegister.differenceInCents).toBe(-500)
    expect(closed.cashRegister.notes).toBe('Contagem revisada')
  })

  it('calculates zero, positive and negative differences', () => {
    expect(calculateExpectedCash(1000, 2500)).toBe(3500)
    expect(calculateDifference(3500, 3500)).toBe(0)
    expect(calculateDifference(3600, 3500)).toBe(100)
    expect(calculateDifference(3400, 3500)).toBe(-100)
  })

  it('lists closed cash registers with the newest first', () => {
    const first = open(100)
    expectSuccess(
      closeCashRegister({ cashRegisterId: first.id, closingAmountInCents: 100 })
    )
    const second = open(200)
    expectSuccess(
      closeCashRegister({ cashRegisterId: second.id, closingAmountInCents: 200 })
    )

    const history = expectSuccess(listPreviousCashRegisters())
    const firstIndex = history.findIndex((item) => item.id === first.id)
    const secondIndex = history.findIndex((item) => item.id === second.id)

    expect(secondIndex).toBeLessThan(firstIndex)
    expect(history.every((item) => item.status === 'closed')).toBe(true)
  })

  it('enforces an open cash register for sales, items and payments', () => {
    const db = getDatabase()

    expect(() =>
      initializeDatabase().exec('INSERT INTO sales (subtotal_in_cents, total_in_cents) VALUES (100, 100)')
    ).toThrow(/CASH_REGISTER_REQUIRED_OPEN|PAID_SALE_IMMUTABLE/)

    const product = db
      .insert(products)
      .values({ name: 'Produto teste', internalCode: 'CASH-TEST', salePriceInCents: 100 })
      .returning()
      .get()
    const cashRegister = open()
    const sale = db
      .insert(sales)
      .values({
        cashRegisterId: cashRegister.id,
        subtotalInCents: 100,
        totalInCents: 100,
        status: 'open'
      })
      .returning()
      .get()
    const payment = db
      .insert(payments)
      .values({ saleId: sale.id, method: 'cash', amountInCents: 100 })
      .returning()
      .get()

    db.insert(saleItems)
      .values({
        saleId: sale.id,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPriceInCents: 100,
        totalInCents: 100
      })
      .run()
    db.update(sales).set({ status: 'paid' }).where(eq(sales.id, sale.id)).run()
    expectSuccess(
      closeCashRegister({ cashRegisterId: cashRegister.id, closingAmountInCents: 100 })
    )

    expect(() =>
      db.update(payments)
        .set({ amountInCents: 200 })
        .where(eq(payments.id, payment.id))
        .run()
    ).toThrow(/CASH_REGISTER_REQUIRED_OPEN|PAID_SALE_IMMUTABLE/)
    expect(() =>
      db.insert(saleItems)
        .values({
          saleId: sale.id,
          productId: product.id,
        productName: product.name,
          quantity: 1,
          unitPriceInCents: 100,
          totalInCents: 100
        })
        .run()
    ).toThrow(/CASH_REGISTER_REQUIRED_OPEN|PAID_SALE_IMMUTABLE/)
    expect(() =>
      db.update(cashRegisters)
        .set({ status: 'open' })
        .where(eq(cashRegisters.id, cashRegister.id))
        .run()
    ).toThrow(/CLOSED_CASH_REGISTER_IMMUTABLE/)
  })
})
