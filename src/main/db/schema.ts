import { relations, sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  description: text('description'),
  priceInCents: integer('price_in_cents').notNull(),
  stockQuantity: real('stock_quantity').notNull().default(0),
  minimumStockQuantity: real('minimum_stock_quantity').notNull().default(0),
  unit: text('unit').notNull().default('unit'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  document: text('document'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const cashRegisters = sqliteTable('cash_registers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openedAt: text('opened_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  closedAt: text('closed_at'),
  openingAmountInCents: integer('opening_amount_in_cents').notNull().default(0),
  closingAmountInCents: integer('closing_amount_in_cents'),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  notes: text('notes')
})

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').references(() => customers.id),
  cashRegisterId: integer('cash_register_id').references(() => cashRegisters.id),
  subtotalInCents: integer('subtotal_in_cents').notNull(),
  discountInCents: integer('discount_in_cents').notNull().default(0),
  totalInCents: integer('total_in_cents').notNull(),
  status: text('status', { enum: ['open', 'paid', 'cancelled'] }).notNull().default('open'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const saleItems = sqliteTable('sale_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: real('quantity').notNull(),
  unitPriceInCents: integer('unit_price_in_cents').notNull(),
  totalInCents: integer('total_in_cents').notNull()
})

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  method: text('method', { enum: ['cash', 'debit_card', 'credit_card', 'pix', 'other'] }).notNull(),
  amountInCents: integer('amount_in_cents').notNull(),
  paidAt: text('paid_at').notNull().default(sql`CURRENT_TIMESTAMP`)
})

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  }),
  cashRegister: one(cashRegisters, {
    fields: [sales.cashRegisterId],
    references: [cashRegisters.id]
  }),
  items: many(saleItems),
  payments: many(payments)
}))

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id]
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id]
  })
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  sale: one(sales, {
    fields: [payments.saleId],
    references: [sales.id]
  })
}))
