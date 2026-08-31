import { and, desc, eq, like, ne, or, type SQL } from 'drizzle-orm'
import type {
  CustomerCreateInput,
  CustomerDuplicateDocumentInput,
  CustomerDuplicateDocumentResult,
  CustomerListFilters,
  CustomerUpdateInput
} from '../../shared/types/customer.types'
import { getDatabase } from '../db'
import { customers } from '../db/schema'

export type CustomerRecord = typeof customers.$inferSelect
export type CustomerInsertRecord = typeof customers.$inferInsert

const mergeConditions = (conditions: SQL[]): SQL | undefined => {
  if (conditions.length === 0) {
    return undefined
  }

  if (conditions.length === 1) {
    return conditions[0]
  }

  return and(...conditions)
}

const buildListWhere = (filters: CustomerListFilters = {}): SQL | undefined => {
  const conditions: SQL[] = []

  if (!filters.includeInactive) {
    conditions.push(eq(customers.isActive, true))
  }

  const query = filters.query?.trim()

  if (query) {
    const search = `%${query}%`
    const searchWhere = or(
      like(customers.name, search),
      like(customers.document, search),
      like(customers.phone, search)
    )

    if (searchWhere) {
      conditions.push(searchWhere)
    }
  }

  return mergeConditions(conditions)
}

export const createCustomer = (input: CustomerCreateInput): CustomerRecord => {
  const db = getDatabase()

  return db
    .insert(customers)
    .values({
      ...input,
      isActive: input.isActive ?? true
    })
    .returning()
    .get()
}

export const listCustomers = (filters: CustomerListFilters = {}): CustomerRecord[] => {
  const db = getDatabase()
  const where = buildListWhere(filters)
  const query = db.select().from(customers)

  if (where) {
    return query.where(where).orderBy(desc(customers.createdAt)).all()
  }

  return query.orderBy(desc(customers.createdAt)).all()
}

export const findCustomerById = (id: number): CustomerRecord | undefined => {
  const db = getDatabase()

  return db.select().from(customers).where(eq(customers.id, id)).limit(1).get()
}

export const findCustomersByName = (
  name: string,
  includeInactive = true
): CustomerRecord[] => {
  const db = getDatabase()
  const search = `%${name.trim()}%`
  const conditions: SQL[] = [like(customers.name, search)]

  if (!includeInactive) {
    conditions.push(eq(customers.isActive, true))
  }

  const where = mergeConditions(conditions)

  return db
    .select()
    .from(customers)
    .where(where)
    .orderBy(desc(customers.createdAt))
    .all()
}

export const updateCustomer = (
  id: number,
  input: CustomerUpdateInput
): CustomerRecord | undefined => {
  const db = getDatabase()

  return db
    .update(customers)
    .set({
      ...input,
      updatedAt: new Date().toISOString()
    })
    .where(eq(customers.id, id))
    .returning()
    .get()
}

export const inactivateCustomer = (id: number): CustomerRecord | undefined => {
  const db = getDatabase()

  return db
    .update(customers)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString()
    })
    .where(eq(customers.id, id))
    .returning()
    .get()
}

export const checkDuplicateDocument = (
  input: CustomerDuplicateDocumentInput
): CustomerDuplicateDocumentResult => {
  const document = input.document?.trim()

  if (!document) {
    return {
      document: false
    }
  }

  const conditions: SQL[] = [eq(customers.document, document)]

  if (input.ignoreCustomerId) {
    conditions.push(ne(customers.id, input.ignoreCustomerId))
  }

  const db = getDatabase()
  const row = db
    .select({
      document: customers.document
    })
    .from(customers)
    .where(mergeConditions(conditions))
    .limit(1)
    .get()

  return {
    document: Boolean(row)
  }
}
