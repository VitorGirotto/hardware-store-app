import type {
  InventoryProduct,
  InventoryServiceResponse,
  StockAdjustmentInput,
  StockEntryInput,
  StockExitInput,
  StockHistoryFilters,
  StockMovement
} from '../../../../shared/types/inventory.types'

const getInventoryApi = (): Window['hardwareStore']['inventory'] => {
  if (!window.hardwareStore?.inventory) {
    throw new Error('API de estoque indisponivel.')
  }

  return window.hardwareStore.inventory
}

export const inventoryApi = {
  registerEntry: (
    input: StockEntryInput
  ): Promise<InventoryServiceResponse<StockMovement>> =>
    getInventoryApi().registerEntry(input),
  registerExit: (
    input: StockExitInput
  ): Promise<InventoryServiceResponse<StockMovement>> =>
    getInventoryApi().registerExit(input),
  registerAdjustment: (
    input: StockAdjustmentInput
  ): Promise<InventoryServiceResponse<StockMovement>> =>
    getInventoryApi().registerAdjustment(input),
  listHistory: (
    filters?: StockHistoryFilters
  ): Promise<InventoryServiceResponse<StockMovement[]>> =>
    getInventoryApi().listHistory(filters),
  listCurrentStock: (): Promise<InventoryServiceResponse<InventoryProduct[]>> =>
    getInventoryApi().listCurrentStock(),
  listLowStock: (): Promise<InventoryServiceResponse<InventoryProduct[]>> =>
    getInventoryApi().listLowStock()
}
