import { z } from 'zod'
import { PRODUCT_UNITS } from '../constants/product.constants'

const optionalTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized.length > 0 ? normalized : null
  })

const nonNegativeMoneyInCentsSchema = z
  .number()
  .int('Informe um valor em centavos.')
  .min(0, 'O valor nao pode ser negativo.')

const nonNegativeQuantitySchema = z
  .number()
  .min(0, 'A quantidade nao pode ser negativa.')

const productEditableFields = {
  name: z.string().trim().min(1, 'Nome e obrigatorio.'),
  internalCode: z.string().trim().min(1, 'Codigo interno e obrigatorio.'),
  barcode: optionalTextSchema,
  ncm: optionalTextSchema,
  category: optionalTextSchema,
  unitOfMeasure: z.enum(PRODUCT_UNITS),
  costPriceInCents: nonNegativeMoneyInCentsSchema,
  salePriceInCents: nonNegativeMoneyInCentsSchema,
  minimumStockQuantity: nonNegativeQuantitySchema,
  isActive: z.boolean()
}

export const productCreateSchema = z.object({
  ...productEditableFields,
  stockQuantity: nonNegativeQuantitySchema,
  isActive: productEditableFields.isActive.default(true)
})

export const productUpdateSchema = z.object(productEditableFields).partial().strict()

export const productIdSchema = z.number().int().positive('Produto invalido.')

export const productListFiltersSchema = z.object({
  query: z.string().optional(),
  includeInactive: z.boolean().optional()
})

export const productDuplicateCodeSchema = z.object({
  internalCode: z.string().trim().optional(),
  barcode: optionalTextSchema,
  ignoreProductId: z.number().int().positive().optional()
})
