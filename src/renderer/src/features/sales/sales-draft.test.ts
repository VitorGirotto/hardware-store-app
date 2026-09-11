import { describe, expect, it } from 'vitest'
import { addProduct, draftToInput, emptySalesDraft, parseMoney, parseQuantity } from './sales-draft'
import type { Product } from '../../../../shared/types/product.types'
const product: Product = { markupPercentage: null, id: 1, name: 'Martelo', internalCode: 'A', barcode: null, category: null, ncm: null, unitOfMeasure: 'Un', costPriceInCents: 0, salePriceInCents: 1234, stockQuantity: 10, minimumStockQuantity: 0, isActive: true, createdAt: '', updatedAt: '' }
describe('PDV draft', () => {
  it('converts decimal input without silently rounding invalid precision', () => {
    expect(parseMoney('12,34')).toBe(1234)
    expect(parseMoney('0.29')).toBe(29)
    expect(parseQuantity('0,5')).toBe(0.5)
    for (const text of ['', '1,234', '-1', 'abc', 'Infinity', '1e3', '9007199254740992']) expect(parseMoney(text)).toBeNaN()
  })
  it('preserves optional received cash and rejects empty or invalid active input', () => {
    const draft = addProduct(emptySalesDraft(), product)
    draft.payments = [{ method: 'cash', amount: '12,34', receivedAmount: '100,00' }]
    expect(draftToInput(draft, 1).payments).toEqual([{ method: 'cash', amountInCents: 1234, receivedAmountInCents: 10000 }])
    for (const value of ['', 'abc', '1,234']) {
      draft.payments[0].receivedAmount = value
      expect(draftToInput(draft, 1).payments[0].receivedAmountInCents).toBeNaN()
    }
    delete draft.payments[0].receivedAmount
    expect(draftToInput(draft, 1).payments[0]).not.toHaveProperty('receivedAmountInCents')
  })
  it('merges repeated products while preserving edited price and line discount', () => {
    const draft = addProduct(emptySalesDraft(), product)
    draft.items[0].unitPrice = '10,00'
    draft.items[0].discount = '1,00'
    const updated = addProduct(draft, product)
    expect(updated.items).toHaveLength(1)
    expect(updated.items[0]).toMatchObject({ quantity: '2', unitPrice: '10,00', discount: '1,00' })
    expect(draft.items[0].quantity).toBe('1')
    expect(draftToInput(updated, 2)).toMatchObject({ cashRegisterId: 2, customerId: null, items: [{ productId: 1, quantity: 2, unitPriceInCents: 1000, discountInCents: 100 }] })
  })
})
