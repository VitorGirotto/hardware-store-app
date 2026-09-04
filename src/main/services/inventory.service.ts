import type { z } from 'zod'
import {
  stockAdjustmentSchema,
  stockEntrySchema,
  stockExitSchema,
  stockHistoryFiltersSchema
} from '../../shared/schemas/inventory.schema'
import type {
  InventoryProduct,
  InventoryServiceResponse,
  StockHistoryFilters,
  StockMovement
} from '../../shared/types/inventory.types'
import {
  InventoryRepositoryError,
  type InventoryRepositoryErrorCode
} from '../repositories/inventory.repository'
import * as inventoryRepository from '../repositories/inventory.repository'

const success = <T>(data: T): InventoryServiceResponse<T> => ({
  success: true,
  data
})

const failure = <T = never>(
  error: string,
  issues?: string[]
): InventoryServiceResponse<T> => ({
  success: false,
  error,
  issues
})

const validationFailure = <T>(error: z.ZodError): InventoryServiceResponse<T> =>
  failure(
    'Dados da movimentacao invalidos.',
    error.issues.map((issue) => issue.message)
  )

const repositoryErrorMessages: Record<InventoryRepositoryErrorCode, string> = {
  PRODUCT_NOT_FOUND: 'Produto nao encontrado.',
  PRODUCT_INACTIVE: 'Nao e possivel movimentar um produto inativo.',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para esta movimentacao.'
}

const toBusinessError = (
  error: unknown,
  fallback: string
): InventoryServiceResponse<never> => {
  if (error instanceof InventoryRepositoryError) {
    return failure(repositoryErrorMessages[error.code])
  }

  if (error instanceof Error && error.message) {
    return failure(error.message)
  }

  return failure(fallback)
}

export const registerEntry = (input: unknown): InventoryServiceResponse<StockMovement> => {
  const parsed = stockEntrySchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    return success(
      inventoryRepository.registerDeltaMovement({
        ...parsed.data,
        type: 'entry',
        quantityDelta: parsed.data.quantity
      })
    )
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel registrar a entrada.')
  }
}

export const registerExit = (input: unknown): InventoryServiceResponse<StockMovement> => {
  const parsed = stockExitSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    return success(
      inventoryRepository.registerDeltaMovement({
        ...parsed.data,
        type: 'sale_exit',
        quantityDelta: -parsed.data.quantity
      })
    )
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel registrar a saida.')
  }
}

export const registerAdjustment = (
  input: unknown
): InventoryServiceResponse<StockMovement> => {
  const parsed = stockAdjustmentSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    if (parsed.data.type === 'correction') {
      return success(
        inventoryRepository.registerCorrectionMovement({
          productId: parsed.data.productId,
          type: parsed.data.type,
          countedQuantity: parsed.data.quantity,
          reason: parsed.data.reason,
          reference: parsed.data.reference
        })
      )
    }

    const direction = parsed.data.type === 'manual_positive_adjustment' ? 1 : -1

    return success(
      inventoryRepository.registerDeltaMovement({
        productId: parsed.data.productId,
        type: parsed.data.type,
        quantityDelta: parsed.data.quantity * direction,
        reason: parsed.data.reason,
        reference: parsed.data.reference
      })
    )
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel registrar o ajuste.')
  }
}

export const listHistory = (
  filters: unknown = {}
): InventoryServiceResponse<StockMovement[]> => {
  const parsed = stockHistoryFiltersSchema.safeParse(filters ?? {})

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    return success(inventoryRepository.listHistory(parsed.data as StockHistoryFilters))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel consultar o historico.')
  }
}

export const listCurrentStock = (): InventoryServiceResponse<InventoryProduct[]> => {
  try {
    return success(inventoryRepository.listCurrentStock())
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel consultar o estoque.')
  }
}

export const listLowStock = (): InventoryServiceResponse<InventoryProduct[]> => {
  try {
    return success(inventoryRepository.listLowStock())
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel consultar o estoque baixo.')
  }
}
