import { and, eq } from 'drizzle-orm'
import { getDatabase } from '../db'
import { cashRegisters, customers, payments, products, saleItems, sales, stockMovements } from '../db/schema'
import type { Sale, SaleFinalizeInput } from '../../shared/types/sales.types'
import { calculateSaleTotals, stockAfterSale, validateSalePayments } from '../../shared/utils/sales'

export class SaleBusinessError extends Error {}

export const finalizeSale = (input: SaleFinalizeInput): Sale => {
  return getDatabase().transaction((tx) => {
    const register = tx.select().from(cashRegisters).where(eq(cashRegisters.id, input.cashRegisterId)).get()
    if (!register || register.status !== 'open') {
      throw new SaleBusinessError('O caixa informado não está aberto. Atualize o caixa antes de finalizar.')
    }
    if (input.customerId != null) {
      const customer = tx.select().from(customers).where(eq(customers.id, input.customerId)).get()
      if (!customer || !customer.isActive) throw new SaleBusinessError('Selecione um cliente ativo ou remova o cliente da venda.')
    }

    const quantities = new Map<number, number>()
    const remainingStock = new Map<number, number>()
    const currentProducts = new Map<number, typeof products.$inferSelect>()
    for (const item of input.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    }
    for (const [id, quantity] of quantities) {
      const product = tx.select().from(products).where(eq(products.id, id)).get()
      if (!product) throw new SaleBusinessError('Produto não encontrado.')
      if (!product.isActive) throw new SaleBusinessError(`O produto ${product.name} está inativo.`)
      try {
        remainingStock.set(id, stockAfterSale(product.stockQuantity, quantity))
      } catch {
        throw new SaleBusinessError(`Estoque insuficiente para ${product.name}. Disponível: ${product.stockQuantity}.`)
      }
      currentProducts.set(id, product)
    }

    const totals = calculateSaleTotals(input.items, input.discountInCents)
    validateSalePayments(input.payments, totals.totalInCents)
    const sale = tx.insert(sales).values({
      cashRegisterId: register.id,
      customerId: input.customerId ?? null,
      subtotalInCents: totals.subtotalInCents,
      discountInCents: totals.discountInCents,
      totalInCents: totals.totalInCents,
      status: 'open'
    }).returning().get()
    const savedItems = totals.items.map((item) => tx.insert(saleItems).values({
      ...item, saleId: sale.id, productName: currentProducts.get(item.productId)!.name
    }).returning().get())
    const savedPayments = input.payments.map((payment) => tx.insert(payments).values({
      ...payment, saleId: sale.id
    }).returning().get())

    for (const [id, quantity] of quantities) {
      const changed = tx.update(products).set({
        stockQuantity: remainingStock.get(id)!,
        updatedAt: new Date().toISOString()
      }).where(and(eq(products.id, id), eq(products.isActive, true), eq(products.stockQuantity, currentProducts.get(id)!.stockQuantity))).run()
      if (changed.changes !== 1) throw new SaleBusinessError('O estoque mudou. Revise os itens da venda.')
      tx.insert(stockMovements).values({
        productId: id, type: 'sale_exit', quantity: -quantity,
        reason: `Venda #${sale.id}`, reference: `sale:${sale.id}`
      }).run()
    }
    const paidSale = tx.update(sales).set({ status: 'paid' }).where(eq(sales.id, sale.id)).returning().get()!
    return { ...paidSale, items: savedItems, payments: savedPayments }
  }, { behavior: 'immediate' })
}
