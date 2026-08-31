import { z } from 'zod'

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

const customerMutationFields = {
  name: z.string().trim().min(1, 'Nome e obrigatorio.'),
  document: optionalTextSchema,
  phone: optionalTextSchema,
  address: optionalTextSchema,
  creditLimitInCents: nonNegativeMoneyInCentsSchema,
  isActive: z.boolean()
}

export const customerCreateSchema = z.object({
  ...customerMutationFields,
  isActive: customerMutationFields.isActive.default(true)
})

export const customerUpdateSchema = z.object(customerMutationFields).partial()

export const customerIdSchema = z.number().int().positive('Cliente invalido.')

export const customerListFiltersSchema = z.object({
  query: z.string().optional(),
  includeInactive: z.boolean().optional()
})

export const customerDuplicateDocumentSchema = z.object({
  document: optionalTextSchema,
  ignoreCustomerId: z.number().int().positive().optional()
})
