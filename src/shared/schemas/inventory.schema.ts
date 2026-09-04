import { z } from 'zod'
import {
  MANUAL_STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPES
} from '../constants/inventory.constants'

const productIdSchema = z.number().int().positive('Produto invalido.')

const positiveQuantitySchema = z
  .number()
  .finite('Informe uma quantidade valida.')
  .positive('A quantidade deve ser maior que zero.')

const countedQuantitySchema = z
  .number()
  .finite('Informe uma quantidade valida.')
  .min(0, 'O saldo contado nao pode ser negativo.')

const reasonSchema = z.string().trim().min(1, 'Motivo e obrigatorio.')

const optionalReferenceSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized.length > 0 ? normalized : null
  })

const requiredReferenceSchema = z
  .string()
  .trim()
  .min(1, 'Referencia e obrigatoria para saida por venda.')

export const stockEntrySchema = z.object({
  productId: productIdSchema,
  quantity: positiveQuantitySchema,
  reason: reasonSchema,
  reference: optionalReferenceSchema
})

export const stockExitSchema = z.object({
  productId: productIdSchema,
  quantity: positiveQuantitySchema,
  reason: reasonSchema,
  reference: requiredReferenceSchema
})

export const stockAdjustmentSchema = z.discriminatedUnion('type', [
  z.object({
    productId: productIdSchema,
    type: z.literal(MANUAL_STOCK_MOVEMENT_TYPES[0]),
    quantity: positiveQuantitySchema,
    reason: reasonSchema,
    reference: optionalReferenceSchema
  }),
  z.object({
    productId: productIdSchema,
    type: z.literal(MANUAL_STOCK_MOVEMENT_TYPES[1]),
    quantity: positiveQuantitySchema,
    reason: reasonSchema,
    reference: optionalReferenceSchema
  }),
  z.object({
    productId: productIdSchema,
    type: z.literal(MANUAL_STOCK_MOVEMENT_TYPES[2]),
    quantity: countedQuantitySchema,
    reason: reasonSchema,
    reference: optionalReferenceSchema
  })
])

export const stockHistoryFiltersSchema = z.object({
  productId: productIdSchema.optional(),
  type: z.enum(STOCK_MOVEMENT_TYPES).optional()
})
