import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '../db'
import { products, saleItems, stockMovements } from '../db/schema'
import {
  listCurrentStock,
  listHistory,
  listLowStock,
  registerAdjustment,
  registerEntry,
  registerExit
} from './inventory.service'
import {
  createProduct,
  getNextInternalCode,
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

let sequence = 0

const buildProductInput = (
  overrides: Partial<ProductCreateInput> = {}
): ProductCreateInput => {
  sequence += 1

  return {
    name: `Produto ${sequence}`,
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
    db.delete(stockMovements).run()
    db.delete(saleItems).run()
    db.delete(products).run()
  })

  it('persists the exact markup without recalculating rounded prices', () => {
    const created = expectSuccess(createProduct(buildProductInput({
      costPriceInCents: 1, salePriceInCents: 2, markupPercentage: 80
    })))
    expect(expectSuccess(findProductById(created.id)).markupPercentage).toBe(80)
    const updated = expectSuccess(updateProduct(created.id, { name: 'Novo nome' }))
    expect(updated).toMatchObject({ markupPercentage: 80, costPriceInCents: 1, salePriceInCents: 2 })
    expect(expectSuccess(updateProduct(created.id, { markupPercentage: null })).markupPercentage).toBeNull()
  })

  it('allows legacy products without markup and rejects invalid percentages', () => {
    const created = expectSuccess(createProduct(buildProductInput()))
    expect(created.markupPercentage).toBeNull()
    for (const markupPercentage of [-101, Infinity, NaN]) {
      expectFailure(createProduct(buildProductInput({ markupPercentage })))
      expectFailure(updateProduct(created.id, { markupPercentage }))
    }
    expect(expectSuccess(updateProduct(created.id, { markupPercentage: -100 })).markupPercentage).toBe(-100)
    expect(expectSuccess(updateProduct(created.id, { markupPercentage: 150.25 })).markupPercentage).toBe(150.25)
  })

  it('creates and lists a product through the repository', () => {
    const created = expectSuccess(createProduct(buildProductInput()))
    const listed = expectSuccess(findProductById(created.id))

    expect(listed.id).toBe(created.id)
    expect(listed.internalCode).toBe(created.internalCode)
  })

  it('registers initial stock and rejects direct stock updates', () => {
    const created = expectSuccess(
      createProduct(buildProductInput({ stockQuantity: 7 }))
    )
    const history = expectSuccess(listHistory({ productId: created.id }))

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      type: 'entry',
      quantity: 7,
      reason: 'Estoque inicial do produto'
    })

    const error = expectFailure(
      updateProduct(created.id, { stockQuantity: 30 })
    )
    const unchanged = expectSuccess(findProductById(created.id))

    expect(error).toBe('Dados do produto invalidos.')
    expect(unchanged.stockQuantity).toBe(7)
  })

  it('prevents duplicate internal codes when editing', () => {
    const first = expectSuccess(createProduct(buildProductInput()))
    const second = expectSuccess(createProduct(buildProductInput()))
    expect(expectFailure(updateProduct(second.id, { internalCode: first.internalCode })))
      .toBe('Codigo interno ja cadastrado.')
  })

  it('starts at one and continues through eight without reserving previews', () => {
    expect(expectSuccess(getNextInternalCode())).toBe('1')
    expect(expectSuccess(getNextInternalCode())).toBe('1')
    for (let code = 1; code <= 8; code++) {
      expect(expectSuccess(createProduct(buildProductInput())).internalCode).toBe(String(code))
    }
  })

  it('uses the largest numeric code including inactive and zero-padded legacy codes', () => {
    const db = getDatabase()
    for (const internalCode of ['1', '2', '4', 'ABC-999', '12ABC', '9.5', '-20']) {
      db.insert(products).values({ salePriceInCents: 100, name: 'Legado', internalCode }).run()
    }
    expect(expectSuccess(getNextInternalCode())).toBe('5')
    db.insert(products).values({ salePriceInCents: 100, name: 'Inativo', internalCode: '007', isActive: false }).run()
    expect(expectSuccess(createProduct(buildProductInput())).internalCode).toBe('8')
  })

  it('ignores nonnumeric legacy codes and preserves precision for long numeric codes', () => {
    const db = getDatabase()
    db.insert(products).values({ salePriceInCents: 100, name: 'Legado', internalCode: 'PROD-99' }).run()
    expect(expectSuccess(getNextInternalCode())).toBe('1')
    db.insert(products).values({ salePriceInCents: 100, name: 'Legado numerico', internalCode: '9007199254740993' }).run()
    expect(expectSuccess(createProduct(buildProductInput())).internalCode).toBe('9007199254740994')
  })

  it('assigns consecutive codes even with stale or supplied previews', () => {
    const preview = expectSuccess(getNextInternalCode())
    const first = expectSuccess(createProduct({ ...buildProductInput(), internalCode: preview }))
    const second = expectSuccess(createProduct({ ...buildProductInput(), internalCode: preview }))
    expect([first.internalCode, second.internalCode]).toEqual(['1', '2'])
  })

  it('does not consume a code when validation or barcode uniqueness fails', () => {
    expectFailure(createProduct(buildProductInput({ name: '' })))
    expect(expectSuccess(getNextInternalCode())).toBe('1')
    expectSuccess(createProduct(buildProductInput({ barcode: 'duplicate' })))
    expectFailure(createProduct(buildProductInput({ barcode: 'duplicate' })))
    expect(expectSuccess(createProduct(buildProductInput())).internalCode).toBe('2')
  })

  it('rolls back the product and code if initial stock insertion fails', () => {
    const db = getDatabase()
    db.run(sql`CREATE TEMP TRIGGER fail_initial_stock BEFORE INSERT ON stock_movements
      BEGIN SELECT RAISE(ABORT, 'Initial stock failed'); END`)
    try {
      expectFailure(createProduct(buildProductInput({ stockQuantity: 5 })))
      expect(db.select().from(products).all()).toHaveLength(0)
      expect(expectSuccess(getNextInternalCode())).toBe('1')
    } finally {
      db.run(sql`DROP TRIGGER fail_initial_stock`)
    }
    expect(expectSuccess(createProduct(buildProductInput())).internalCode).toBe('1')
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
          barcode: '7891000000025'
        })
      )
    )

    const updated = expectSuccess(
      updateProduct(created.id, {
        name: 'Produto atualizado',
        internalCode: created.internalCode,
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

describe('inventory service', () => {
  beforeEach(() => {
    const db = getDatabase()
    db.delete(stockMovements).run()
    db.delete(saleItems).run()
    db.delete(products).run()
  })

  it('registers entries and sale exits with signed quantities', () => {
    const product = expectSuccess(
      createProduct(buildProductInput({ stockQuantity: 10 }))
    )

    const entry = expectSuccess(
      registerEntry({
        productId: product.id,
        quantity: 4,
        reason: 'Compra recebida',
        reference: 'NF-100'
      })
    )
    const exit = expectSuccess(
      registerExit({
        productId: product.id,
        quantity: 3,
        reason: 'Venda concluida',
        reference: 'sale:10'
      })
    )
    const current = expectSuccess(findProductById(product.id))

    expect(entry.quantity).toBe(4)
    expect(exit.quantity).toBe(-3)
    expect(current.stockQuantity).toBe(11)
  })

  it('registers positive, negative and correction adjustments', () => {
    const product = expectSuccess(
      createProduct(buildProductInput({ stockQuantity: 10 }))
    )

    expectSuccess(
      registerAdjustment({
        productId: product.id,
        type: 'manual_positive_adjustment',
        quantity: 2,
        reason: 'Item encontrado'
      })
    )
    const negative = expectSuccess(
      registerAdjustment({
        productId: product.id,
        type: 'manual_negative_adjustment',
        quantity: 3,
        reason: 'Item avariado'
      })
    )
    const correction = expectSuccess(
      registerAdjustment({
        productId: product.id,
        type: 'correction',
        quantity: 5,
        reason: 'Contagem fisica'
      })
    )
    const current = expectSuccess(findProductById(product.id))

    expect(negative.quantity).toBe(-3)
    expect(correction.quantity).toBe(-4)
    expect(current.stockQuantity).toBe(5)
  })

  it('blocks invalid movements and insufficient stock', () => {
    const product = expectSuccess(
      createProduct(buildProductInput({ stockQuantity: 2 }))
    )

    expect(expectFailure(registerEntry({
      productId: product.id,
      quantity: 0,
      reason: 'Compra'
    }))).toBe('Dados da movimentacao invalidos.')

    expect(expectFailure(registerEntry({
      productId: product.id,
      quantity: 1,
      reason: ' '
    }))).toBe('Dados da movimentacao invalidos.')

    expect(expectFailure(registerExit({
      productId: product.id,
      quantity: 1,
      reason: 'Venda',
      reference: ''
    }))).toBe('Dados da movimentacao invalidos.')

    expect(expectFailure(registerExit({
      productId: product.id,
      quantity: 3,
      reason: 'Venda',
      reference: 'sale:11'
    }))).toBe('Estoque insuficiente para esta movimentacao.')

    expect(expectSuccess(findProductById(product.id)).stockQuantity).toBe(2)
    expect(expectSuccess(listHistory({ productId: product.id }))).toHaveLength(1)
  })

  it('rejects nonexistent and inactive products', () => {
    expect(expectFailure(registerEntry({
      productId: 999999,
      quantity: 1,
      reason: 'Compra'
    }))).toBe('Produto nao encontrado.')

    const product = expectSuccess(createProduct(buildProductInput()))
    expectSuccess(inactivateProduct(product.id))

    expect(expectFailure(registerEntry({
      productId: product.id,
      quantity: 1,
      reason: 'Compra'
    }))).toBe('Nao e possivel movimentar um produto inativo.')
  })

  it('lists active stock, low stock and filtered history', () => {
    const low = expectSuccess(
      createProduct(
        buildProductInput({
          name: 'Produto baixo',
          stockQuantity: 2,
          minimumStockQuantity: 2
        })
      )
    )
    const regular = expectSuccess(
      createProduct(
        buildProductInput({
          name: 'Produto regular',
          stockQuantity: 8,
          minimumStockQuantity: 2
        })
      )
    )
    const inactive = expectSuccess(
      createProduct(buildProductInput({ name: 'Produto inativo' }))
    )
    expectSuccess(inactivateProduct(inactive.id))
    expectSuccess(registerEntry({
      productId: regular.id,
      quantity: 1,
      reason: 'Reposicao'
    }))

    const currentStock = expectSuccess(listCurrentStock())
    const lowStock = expectSuccess(listLowStock())
    const entries = expectSuccess(listHistory({
      productId: regular.id,
      type: 'entry'
    }))

    expect(currentStock.map((item) => item.id)).toEqual(
      expect.arrayContaining([low.id, regular.id])
    )
    expect(currentStock.map((item) => item.id)).not.toContain(inactive.id)
    expect(lowStock.map((item) => item.id)).toEqual([low.id])
    expect(entries.every((movement) => movement.productId === regular.id)).toBe(true)
    expect(entries.every((movement) => movement.type === 'entry')).toBe(true)
    expect(entries[0].id).toBeGreaterThan(entries[1].id)
  })
})
