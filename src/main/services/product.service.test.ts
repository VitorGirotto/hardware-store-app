import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '../db'
import { products, saleItems } from '../db/schema'
import {
  createProduct,
  findProductById,
  findProductsByName,
  inactivateProduct,
  updateProduct
} from './product.service'
import type {
  Product,
  ProductCreateInput,
  ProductServiceResponse
} from '../../shared/types/product.types'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp'
  }
}))

let sequence = 0

const buildProductInput = (
  overrides: Partial<ProductCreateInput> = {}
): ProductCreateInput => {
  sequence += 1

  return {
    name: `Produto ${sequence}`,
    internalCode: `PROD-${sequence}`,
    barcode: null,
    ncm: '73181500',
    category: 'Ferragens',
    unitOfMeasure: 'Un',
    costPriceInCents: 100,
    salePriceInCents: 250,
    stockQuantity: 10,
    minimumStockQuantity: 2,
    isActive: true,
    ...overrides
  }
}

const expectSuccess = <T>(result: ProductServiceResponse<T>): T => {
  expect(result.success).toBe(true)

  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data
}

const expectFailure = <T>(result: ProductServiceResponse<T>): string => {
  expect(result.success).toBe(false)

  if (result.success) {
    throw new Error('Expected failure response.')
  }

  return result.error
}

describe('product service', () => {
  beforeEach(() => {
    const db = getDatabase()
    db.delete(saleItems).run()
    db.delete(products).run()
  })

  it('creates and lists a product through the repository', () => {
    const created = expectSuccess(createProduct(buildProductInput()))
    const listed = expectSuccess(findProductById(created.id))

    expect(listed.id).toBe(created.id)
    expect(listed.internalCode).toBe(created.internalCode)
  })

  it('prevents duplicate internal code', () => {
    expectSuccess(createProduct(buildProductInput({ internalCode: 'DUP-001' })))

    const error = expectFailure(
      createProduct(buildProductInput({ internalCode: 'DUP-001' }))
    )

    expect(error).toBe('Codigo interno ja cadastrado.')
  })

  it('prevents duplicate barcode when it is filled', () => {
    expectSuccess(createProduct(buildProductInput({ barcode: '7891000000018' })))

    const error = expectFailure(
      createProduct(buildProductInput({ barcode: '7891000000018' }))
    )

    expect(error).toBe('Codigo de barras ja cadastrado.')
  })

  it('allows multiple products without barcode', () => {
    const first = expectSuccess(createProduct(buildProductInput({ barcode: null })))
    const second = expectSuccess(createProduct(buildProductInput({ barcode: null })))

    expect(first.barcode).toBeNull()
    expect(second.barcode).toBeNull()
  })

  it('updates a product without flagging its own codes as duplicates', () => {
    const created = expectSuccess(
      createProduct(
        buildProductInput({
          internalCode: 'UPD-001',
          barcode: '7891000000025'
        })
      )
    )

    const updated = expectSuccess(
      updateProduct(created.id, {
        name: 'Produto atualizado',
        internalCode: 'UPD-001',
        barcode: '7891000000025',
        salePriceInCents: 300
      })
    )

    expect(updated.name).toBe('Produto atualizado')
    expect(updated.salePriceInCents).toBe(300)
  })

  it('inactivates a product', () => {
    const created = expectSuccess(createProduct(buildProductInput()))
    const inactive = expectSuccess(inactivateProduct(created.id))

    expect(inactive.isActive).toBe(false)
  })

  it('finds products by name', () => {
    const created = expectSuccess(
      createProduct(buildProductInput({ name: 'Martelo unha' }))
    )
    expectSuccess(createProduct(buildProductInput({ name: 'Chave phillips' })))

    const results = expectSuccess(findProductsByName('Martelo'))
    const ids = results.map((product: Product) => product.id)

    expect(ids).toContain(created.id)
  })

  it('rejects empty names and negative values', () => {
    const emptyNameError = expectFailure(
      createProduct(buildProductInput({ name: ' ' }))
    )
    const negativePriceError = expectFailure(
      createProduct(buildProductInput({ salePriceInCents: -1 }))
    )

    expect(emptyNameError).toBe('Dados do produto invalidos.')
    expect(negativePriceError).toBe('Dados do produto invalidos.')
  })
})
