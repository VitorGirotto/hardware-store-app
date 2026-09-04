import type {
  ManualStockMovementType,
  StockMovementType
} from '../constants/inventory.constants'
import type { ProductUnit } from '../constants/product.constants'

export type InventoryProduct = {
  id: number
  name: string
  internalCode: string
  unitOfMeasure: ProductUnit
  stockQuantity: number
  minimumStockQuantity: number
  isLowStock: boolean
}

export type StockMovement = {
  id: number
  productId: number
  productName: string
  productInternalCode: string
  productUnitOfMeasure: ProductUnit
  type: StockMovementType
  quantity: number
  reason: string
  reference: string | null
  createdAt: string
}

export type StockEntryInput = {
  productId: number
  quantity: number
  reason: string
  reference?: string | null
}

export type StockExitInput = {
  productId: number
  quantity: number
  reason: string
  reference: string
}

export type StockAdjustmentInput = {
  productId: number
  type: ManualStockMovementType
  quantity: number
  reason: string
  reference?: string | null
}

export type StockHistoryFilters = {
  productId?: number
  type?: StockMovementType
}

export type InventoryServiceResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      issues?: string[]
    }
