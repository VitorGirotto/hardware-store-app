import { z } from 'zod'

const nonNegativeMoneyInCentsSchema = z
  .number()
  .int('Informe um valor em centavos.')
  .min(0, 'O valor nao pode ser negativo.')

const optionalNotesSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized.length > 0 ? normalized : null
  })

export const cashRegisterIdSchema = z
  .number()
  .int()
  .positive('Caixa invalido.')

export const cashRegisterOpenSchema = z.object({
  openingAmountInCents: nonNegativeMoneyInCentsSchema
})

export const cashRegisterCloseSchema = z.object({
  cashRegisterId: cashRegisterIdSchema,
  closingAmountInCents: nonNegativeMoneyInCentsSchema,
  notes: optionalNotesSchema
})
