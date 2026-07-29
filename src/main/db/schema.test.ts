import { describe, expect, it } from 'vitest'
import { products } from './schema'

describe('database schema', () => {
  it('defines the products table', () => {
    expect(products.id).toBeDefined()
    expect(products.name).toBeDefined()
    expect(products.sku).toBeDefined()
    expect(products.priceInCents).toBeDefined()
  })
})
