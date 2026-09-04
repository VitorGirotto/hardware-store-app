import { describe, expect, it } from 'vitest'
import { cashRegisters, customers, products, stockMovements } from './schema'

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

  it('defines the customers table', () => {
    expect(customers.id).toBeDefined()
    expect(customers.name).toBeDefined()
    expect(customers.document).toBeDefined()
    expect(customers.phone).toBeDefined()
    expect(customers.address).toBeDefined()
    expect(customers.creditLimitInCents).toBeDefined()
    expect(customers.isActive).toBeDefined()
    expect(customers.createdAt).toBeDefined()
    expect(customers.updatedAt).toBeDefined()
  })

  it('defines the stock movements table', () => {
    expect(stockMovements.id).toBeDefined()
    expect(stockMovements.productId).toBeDefined()
    expect(stockMovements.type).toBeDefined()
    expect(stockMovements.quantity).toBeDefined()
    expect(stockMovements.reason).toBeDefined()
    expect(stockMovements.reference).toBeDefined()
    expect(stockMovements.createdAt).toBeDefined()
  })

  it('defines the cash registers table', () => {
    expect(cashRegisters.id).toBeDefined()
    expect(cashRegisters.openedAt).toBeDefined()
    expect(cashRegisters.closedAt).toBeDefined()
    expect(cashRegisters.openingAmountInCents).toBeDefined()
    expect(cashRegisters.closingAmountInCents).toBeDefined()
    expect(cashRegisters.differenceInCents).toBeDefined()
    expect(cashRegisters.status).toBeDefined()
    expect(cashRegisters.notes).toBeDefined()
  })
})
