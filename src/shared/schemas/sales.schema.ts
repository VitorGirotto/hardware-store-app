import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants/sales.constants'
import { calculateSaleTotals, validateSalePayments } from '../utils/sales'

const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const saleFinalizeSchema = z.object({
  cashRegisterId: id,
  customerId: id.nullish(),
  items: z.array(z.object({
    productId: id,
    quantity: z.number().finite().positive('A quantidade deve ser maior que zero.'),
    unitPriceInCents: money,
    discountInCents: money.default(0)
  }).strict()).min(1, 'A venda precisa ter pelo menos um item.'),
  discountInCents: money.default(0),
  payments: z.array(z.object({
    method: z.enum(PAYMENT_METHODS),
    amountInCents: money.positive('O pagamento deve ser maior que zero.'),
    receivedAmountInCents: money.optional()
  }).strict())
}).strict().superRefine((input, ctx) => {
  try {
    const totals = calculateSaleTotals(input.items, input.discountInCents)
    validateSalePayments(input.payments, totals.totalInCents)
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Valores inválidos.' })
  }
})
