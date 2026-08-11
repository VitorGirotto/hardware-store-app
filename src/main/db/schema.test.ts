import { describe, expect, it } from 'vitest'
import { products } from './schema'

describe('database schema', () => {
  it('defines the products table', () => {
    expect(products.id).toBeDefined()
    expect(products.name).toBeDefined()
    expect(products.internalCode).toBeDefined()
    expect(products.barcode).toBeDefined()
    expect(products.unitOfMeasure).toBeDefined()
    expect(products.costPriceInCents).toBeDefined()
    expect(products.salePriceInCents).toBeDefined()
    expect(products.stockQuantity).toBeDefined()
    expect(products.minimumStockQuantity).toBeDefined()
    expect(products.isActive).toBeDefined()
    expect(products.createdAt).toBeDefined()
    expect(products.updatedAt).toBeDefined()
  })
})
