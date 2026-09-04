import { and, desc, eq, like, ne, or, type SQL } from 'drizzle-orm'
import { getDatabase } from '../db'
import { products, stockMovements } from '../db/schema'
import type {
  ProductCreateInput,
  ProductDuplicateCodeInput,
  ProductDuplicateCodeResult,
  ProductListFilters,
  ProductUpdateInput
} from '../../shared/types/product.types'

export type ProductRecord = typeof products.$inferSelect
export type ProductInsertRecord = typeof products.$inferInsert

const mergeConditions = (conditions: SQL[]): SQL | undefined => {
  if (conditions.length === 0) {
    return undefined
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return and(...conditions)
}

const buildListWhere = (filters: ProductListFilters = {}): SQL | undefined => {
  const conditions: SQL[] = []

  if (!filters.includeInactive) {
    conditions.push(eq(products.isActive, true))
  }

  const query = filters.query?.trim()

  if (query) {
    const search = `%${query}%`
    const searchWhere = or(
      like(products.name, search),
      like(products.internalCode, search),
      like(products.barcode, search)
    )

    if (searchWhere) {
      conditions.push(searchWhere)
    }
  }

  return mergeConditions(conditions)
}

export const createProduct = (input: ProductCreateInput): ProductRecord => {
  const db = getDatabase()
  const { stockQuantity, ...productInput } = input

  return db.transaction((tx) => {
    const product = tx
      .insert(products)
      .values({
        ...productInput,
        stockQuantity,
        isActive: input.isActive ?? true
      })
      .returning()
      .get()

    if (stockQuantity > 0) {
      tx.insert(stockMovements)
        .values({
          productId: product.id,
          type: 'entry',
          quantity: stockQuantity,
          reason: 'Estoque inicial do produto',
          reference: `product:${product.id}`
        })
        .run()
    }

    return product
  })
}

export const listProducts = (filters: ProductListFilters = {}): ProductRecord[] => {
  const db = getDatabase()
  const where = buildListWhere(filters)
  const query = db.select().from(products)

  if (where) {
    return query.where(where).orderBy(desc(products.createdAt)).all()
  }

  return query.orderBy(desc(products.createdAt)).all()
}

export const findProductById = (id: number): ProductRecord | undefined => {
  const db = getDatabase()

  return db.select().from(products).where(eq(products.id, id)).limit(1).get()
}

export const findProductsByName = (
  name: string,
  includeInactive = true
): ProductRecord[] => {
  const db = getDatabase()
  const search = `%${name.trim()}%`
  const conditions: SQL[] = [like(products.name, search)]

  if (!includeInactive) {
    conditions.push(eq(products.isActive, true))
  }

  const where = mergeConditions(conditions)

  return db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .all()
}

export const updateProduct = (
  id: number,
  input: ProductUpdateInput
): ProductRecord | undefined => {
  const db = getDatabase()

  return db
    .update(products)
    .set({
      ...input,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.id, id))
    .returning()
    .get()
}

export const inactivateProduct = (id: number): ProductRecord | undefined => {
  const db = getDatabase()

  return db
    .update(products)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.id, id))
    .returning()
    .get()
}

export const checkDuplicateCodes = (
  input: ProductDuplicateCodeInput
): ProductDuplicateCodeResult => {
  const internalCode = input.internalCode?.trim()
  const barcode = input.barcode?.trim()
  const codeConditions: SQL[] = []

  if (internalCode) {
    codeConditions.push(eq(products.internalCode, internalCode))
  }

  if (barcode) {
    codeConditions.push(eq(products.barcode, barcode))
  }

  const codeWhere = mergeConditions(
    codeConditions.length > 1 ? [or(...codeConditions) as SQL] : codeConditions
  )

  if (!codeWhere) {
    return {
      internalCode: false,
      barcode: false
    }
  }

  const conditions = [codeWhere]

  if (input.ignoreProductId) {
    conditions.push(ne(products.id, input.ignoreProductId))
  }

  const db = getDatabase()
  const rows = db
    .select({
      internalCode: products.internalCode,
      barcode: products.barcode
    })
    .from(products)
    .where(mergeConditions(conditions))
    .all()

  return {
    internalCode: Boolean(
      internalCode && rows.some((product) => product.internalCode === internalCode)
    ),
    barcode: Boolean(barcode && rows.some((product) => product.barcode === barcode))
  }
}
