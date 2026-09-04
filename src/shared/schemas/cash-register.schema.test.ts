import { describe, expect, it } from 'vitest'
import {
  cashRegisterCloseSchema,
  cashRegisterIdSchema,
  cashRegisterOpenSchema
} from './cash-register.schema'

describe('cash register schemas', () => {
  it('accepts zero as an opening amount', () => {
    expect(
      cashRegisterOpenSchema.safeParse({ openingAmountInCents: 0 }).success
    ).toBe(true)
  })

  it('rejects negative and fractional values in cents', () => {
    expect(
      cashRegisterOpenSchema.safeParse({ openingAmountInCents: -1 }).success
    ).toBe(false)
    expect(
      cashRegisterOpenSchema.safeParse({ openingAmountInCents: 10.5 }).success
    ).toBe(false)
    expect(
      cashRegisterCloseSchema.safeParse({
        cashRegisterId: 1,
        closingAmountInCents: -1
      }).success
    ).toBe(false)
  })

  it('rejects invalid ids', () => {
    expect(cashRegisterIdSchema.safeParse(0).success).toBe(false)
    expect(cashRegisterIdSchema.safeParse(1.5).success).toBe(false)
  })

  it('normalizes optional notes', () => {
    const empty = cashRegisterCloseSchema.parse({
      cashRegisterId: 1,
      closingAmountInCents: 100,
      notes: '  '
    })
    const filled = cashRegisterCloseSchema.parse({
      cashRegisterId: 1,
      closingAmountInCents: 100,
      notes: '  Conferido pelo operador  '
    })

    expect(empty.notes).toBeNull()
    expect(filled.notes).toBe('Conferido pelo operador')
  })
})
