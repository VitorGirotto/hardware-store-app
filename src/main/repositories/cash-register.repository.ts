import { and, desc, eq, sql } from 'drizzle-orm'
import type {
  CashRegister,
  CashRegisterOpenInput
} from '../../shared/types/cash-register.types'
import { getDatabase } from '../db'
import { cashRegisters, payments, sales } from '../db/schema'

export type CashRegisterRecord = typeof cashRegisters.$inferSelect

export type CashRegisterTotals = {
  totalSoldInCents: number
  cashPaymentsInCents: number
}

type CloseCashRegisterInput = {
  closingAmountInCents: number
  differenceInCents: number
  notes: string | null
}

export const openCashRegister = (
  input: CashRegisterOpenInput
): CashRegister => {
  const db = getDatabase()

  return db
    .insert(cashRegisters)
    .values({ openingAmountInCents: input.openingAmountInCents })
    .returning()
    .get()
}

export const findOpenCashRegister = (): CashRegister | undefined => {
  const db = getDatabase()

  return db
    .select()
    .from(cashRegisters)
    .where(eq(cashRegisters.status, 'open'))
    .limit(1)
    .get()
}

export const findCashRegisterById = (
  id: number
): CashRegister | undefined => {
  const db = getDatabase()

  return db
    .select()
    .from(cashRegisters)
    .where(eq(cashRegisters.id, id))
    .limit(1)
    .get()
}

export const closeCashRegister = (
  id: number,
  input: CloseCashRegisterInput
): CashRegister | undefined => {
  const db = getDatabase()

  return db
    .update(cashRegisters)
    .set({
      closedAt: new Date().toISOString(),
      closingAmountInCents: input.closingAmountInCents,
      differenceInCents: input.differenceInCents,
      status: 'closed',
      notes: input.notes
    })
    .where(and(eq(cashRegisters.id, id), eq(cashRegisters.status, 'open')))
    .returning()
    .get()
}

export const listCashRegisters = (): CashRegister[] => {
  const db = getDatabase()

  return db
    .select()
    .from(cashRegisters)
    .orderBy(desc(cashRegisters.openedAt), desc(cashRegisters.id))
    .all()
}

export const listClosedCashRegisters = (): CashRegister[] => {
  const db = getDatabase()

  return db
    .select()
    .from(cashRegisters)
    .where(eq(cashRegisters.status, 'closed'))
    .orderBy(desc(cashRegisters.closedAt), desc(cashRegisters.id))
    .all()
}

export const hasOpenSales = (cashRegisterId: number): boolean => {
  const db = getDatabase()
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(
      and(
        eq(sales.cashRegisterId, cashRegisterId),
        eq(sales.status, 'open')
      )
    )
    .get()

  return Number(result?.count ?? 0) > 0
}

export const getCashRegisterTotals = (
  cashRegisterId: number
): CashRegisterTotals => {
  const db = getDatabase()
  const salesTotal = db
    .select({ total: sql<number>`coalesce(sum(${sales.totalInCents}), 0)` })
    .from(sales)
    .where(
      and(
        eq(sales.cashRegisterId, cashRegisterId),
        eq(sales.status, 'paid')
      )
    )
    .get()
  const cashTotal = db
    .select({ total: sql<number>`coalesce(sum(${payments.amountInCents}), 0)` })
    .from(payments)
    .innerJoin(sales, eq(payments.saleId, sales.id))
    .where(
      and(
        eq(sales.cashRegisterId, cashRegisterId),
        eq(sales.status, 'paid'),
        eq(payments.method, 'cash')
      )
    )
    .get()

  return {
    totalSoldInCents: Number(salesTotal?.total ?? 0),
    cashPaymentsInCents: Number(cashTotal?.total ?? 0)
  }
}
