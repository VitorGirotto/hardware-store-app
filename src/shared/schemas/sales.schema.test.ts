import { describe, expect, it } from 'vitest'
import { saleFinalizeSchema } from './sales.schema'
import { calculateSaleTotals } from '../utils/sales'

const input = () => ({
  cashRegisterId: 1, discountInCents: 10,
  items: [{ productId: 1, quantity: 1.5, unitPriceInCents: 101, discountInCents: 2 }],
  payments: [{ method: 'pix', amountInCents: 140 }]
})
describe('sale validation and totals', () => {
  it('rounds each line and applies item and sale discounts', () => {
    expect(calculateSaleTotals(input().items, 10)).toMatchObject({ subtotalInCents: 150, totalInCents: 140 })
    expect(saleFinalizeSchema.safeParse(input()).success).toBe(true)
  })
  it('allows a zero total without payments', () => {
    expect(saleFinalizeSchema.safeParse({ ...input(), discountInCents: 150, payments: [] }).success).toBe(true)
  })
  it.each([0, -1, Infinity, NaN])('rejects invalid quantity %s', (quantity) => {
    const value = input()
    value.items[0].quantity = quantity
    expect(saleFinalizeSchema.safeParse(value).success).toBe(false)
  })
  it('rejects empty items, invalid money, excessive discounts and injected totals', () => {
    for (const override of [
      { items: [] }, { totalInCents: 140 }, { discountInCents: 151 },
      { discountInCents: -1 }, { discountInCents: 0.5 }, { discountInCents: Number.MAX_SAFE_INTEGER + 1 }
    ]) expect(saleFinalizeSchema.safeParse({ ...input(), ...override }).success).toBe(false)
    for (const unitPriceInCents of [-1, 0.1, Number.MAX_SAFE_INTEGER]) {
      expect(saleFinalizeSchema.safeParse({ ...input(), items: [{ ...input().items[0], unitPriceInCents }] }).success).toBe(false)
    }
    expect(() => calculateSaleTotals([{ ...input().items[0], discountInCents: 153 }], 0)).toThrow()
    expect(() => calculateSaleTotals(Array(2).fill({ ...input().items[0], quantity: 1, unitPriceInCents: Number.MAX_SAFE_INTEGER, discountInCents: 0 }), 0)).toThrow()
  })
  it.each([0, -1, 139, 141, 0.5])('rejects invalid or mismatched payment %s', (amountInCents) => {
    expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'cash', amountInCents }] }).success).toBe(false)
  })
  it('validates received cash independently of the amount applied to the sale', () => {
    for (const receivedAmountInCents of [140, 10000]) {
      expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'cash', amountInCents: 140, receivedAmountInCents }] }).success).toBe(true)
    }
    for (const receivedAmountInCents of [139, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
      expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'cash', amountInCents: 140, receivedAmountInCents }] }).success).toBe(false)
    }
    expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'pix', amountInCents: 140, receivedAmountInCents: 200 }] }).success).toBe(false)
    expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'cash', amountInCents: 140, receivedAmountInCents: 200, changeInCents: 60 }] }).success).toBe(false)
  })
  it('accepts mixed methods and rejects unsupported methods', () => {
    expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'cash', amountInCents: 40 }, { method: 'credit_card', amountInCents: 100 }] }).success).toBe(true)
    expect(saleFinalizeSchema.safeParse({ ...input(), payments: [{ method: 'other', amountInCents: 140 }] }).success).toBe(false)
  })
})
