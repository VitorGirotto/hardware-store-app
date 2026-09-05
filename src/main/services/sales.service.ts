import { saleFinalizeSchema } from '../../shared/schemas/sales.schema'
import type { Sale, SaleServiceResponse } from '../../shared/types/sales.types'
import * as salesRepository from '../repositories/sales.repository'

export const finalizeSale = (input: unknown): SaleServiceResponse<Sale> => {
  const parsed = saleFinalizeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Dados da venda inválidos.', issues: parsed.error.issues.map((issue) => issue.message) }
  }
  try {
    return { success: true, data: salesRepository.finalizeSale(parsed.data) }
  } catch (error) {
    // The transaction has already rolled back before a failure reaches this boundary.
    return {
      success: false,
      error: error instanceof salesRepository.SaleBusinessError
        ? error.message
        : 'Não foi possível finalizar a venda. Nenhuma alteração foi salva.'
    }
  }
}
