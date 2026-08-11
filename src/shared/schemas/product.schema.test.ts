import { describe, expect, it } from 'vitest'
import { productCreateSchema } from './product.schema'

const validProductInput = {
  name: 'Parafuso sextavado',
  internalCode: 'PAR-001',
  barcode: '7891000000001',
  ncm: '73181500',
  category: 'Fixadores',
  unitOfMeasure: 'Un',
  costPriceInCents: 120,
  salePriceInCents: 250,
  stockQuantity: 10,
  minimumStockQuantity: 3,
  isActive: true
} as const

describe('product schema', () => {
  it('accepts a valid product payload', () => {
    const result = productCreateSchema.safeParse(validProductInput)

    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = productCreateSchema.safeParse({
      ...validProductInput,
      name: '   '
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative sale price', () => {
    const result = productCreateSchema.safeParse({
      ...validProductInput,
      salePriceInCents: -1
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative cost price', () => {
    const result = productCreateSchema.safeParse({
      ...validProductInput,
      costPriceInCents: -1
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative stock', () => {
    const result = productCreateSchema.safeParse({
      ...validProductInput,
      stockQuantity: -1
    })

    expect(result.success).toBe(false)
  })

  it('rejects invalid unit of measure', () => {
    const result = productCreateSchema.safeParse({
      ...validProductInput,
      unitOfMeasure: 'Caixa'
    })

    expect(result.success).toBe(false)
  })
})
