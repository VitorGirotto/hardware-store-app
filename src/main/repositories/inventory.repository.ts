import { and, asc, desc, eq, lte, type SQL } from 'drizzle-orm'
import type { StockMovementType } from '../../shared/constants/inventory.constants'
import type {
  InventoryProduct,
  StockHistoryFilters,
  StockMovement
} from '../../shared/types/inventory.types'
import { getDatabase } from '../db'
import { products, stockMovements } from '../db/schema'

export type InventoryRepositoryErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'INSUFFICIENT_STOCK'

export class InventoryRepositoryError extends Error {
  constructor(public readonly code: InventoryRepositoryErrorCode) {
    super(code)
    this.name = 'InventoryRepositoryError'
  }
}

type MovementDetails = {
  productId: number
  type: StockMovementType
  reason: string
  reference: string | null
}

type DeltaMovementInput = MovementDetails & {
  quantityDelta: number
}

type CorrectionMovementInput = MovementDetails & {
  countedQuantity: number
}

const toInventoryProduct = (
  product: typeof products.$inferSelect
): InventoryProduct => ({
  id: product.id,
  name: product.name,
  internalCode: product.internalCode,
  unitOfMeasure: product.unitOfMeasure,
  stockQuantity: product.stockQuantity,
  minimumStockQuantity: product.minimumStockQuantity,
  isLowStock: product.stockQuantity <= product.minimumStockQuantity
})

const toStockMovement = (
  movement: typeof stockMovements.$inferSelect,
  product: typeof products.$inferSelect
): StockMovement => ({
  ...movement,
  productName: product.name,
  productInternalCode: product.internalCode,
  productUnitOfMeasure: product.unitOfMeasure
})

const assertMovableProduct = (
  product: typeof products.$inferSelect | undefined
): typeof products.$inferSelect => {
  if (!product) {
    throw new InventoryRepositoryError('PRODUCT_NOT_FOUND')
  }

  if (!product.isActive) {
    throw new InventoryRepositoryError('PRODUCT_INACTIVE')
  }

  return product
}

export const registerDeltaMovement = (
  input: DeltaMovementInput
): StockMovement => {
  const db = getDatabase()

  return db.transaction((tx) => {
    const product = assertMovableProduct(
      tx.select().from(products).where(eq(products.id, input.productId)).limit(1).get()
    )
    const nextQuantity = product.stockQuantity + input.quantityDelta

    if (nextQuantity < 0) {
      throw new InventoryRepositoryError('INSUFFICIENT_STOCK')
    }

    tx.update(products)
      .set({
        stockQuantity: nextQuantity,
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, product.id))
      .run()

    const movement = tx
      .insert(stockMovements)
      .values({
        productId: product.id,
        type: input.type,
        quantity: input.quantityDelta,
        reason: input.reason,
        reference: input.reference
      })
      .returning()
      .get()

    return toStockMovement(movement, product)
  })
}

export const registerCorrectionMovement = (
  input: CorrectionMovementInput
): StockMovement => {
  const db = getDatabase()

  return db.transaction((tx) => {
    const product = assertMovableProduct(
      tx.select().from(products).where(eq(products.id, input.productId)).limit(1).get()
    )
    const quantityDelta = input.countedQuantity - product.stockQuantity

    tx.update(products)
      .set({
        stockQuantity: input.countedQuantity,
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, product.id))
      .run()

    const movement = tx
      .insert(stockMovements)
      .values({
        productId: product.id,
        type: input.type,
        quantity: quantityDelta,
        reason: input.reason,
        reference: input.reference
      })
      .returning()
      .get()

    return toStockMovement(movement, product)
  })
}

export const listCurrentStock = (): InventoryProduct[] => {
  const db = getDatabase()

  return db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name))
    .all()
    .map(toInventoryProduct)
}

export const listLowStock = (): InventoryProduct[] => {
  const db = getDatabase()

  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        lte(products.stockQuantity, products.minimumStockQuantity)
      )
    )
    .orderBy(asc(products.name))
    .all()
    .map(toInventoryProduct)
}

export const listHistory = (
  filters: StockHistoryFilters = {}
): StockMovement[] => {
  const conditions: SQL[] = []

  if (filters.productId) {
    conditions.push(eq(stockMovements.productId, filters.productId))
  }

  if (filters.type) {
    conditions.push(eq(stockMovements.type, filters.type))
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0]
  const db = getDatabase()
  const query = db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productInternalCode: products.internalCode,
      productUnitOfMeasure: products.unitOfMeasure,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      reason: stockMovements.reason,
      reference: stockMovements.reference,
      createdAt: stockMovements.createdAt
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))

  if (where) {
    return query
      .where(where)
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .all()
  }

  return query
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .all()
}
