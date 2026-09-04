export const STOCK_MOVEMENT_TYPES = [
  'entry',
  'sale_exit',
  'manual_positive_adjustment',
  'manual_negative_adjustment',
  'correction'
] as const

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

export const MANUAL_STOCK_MOVEMENT_TYPES = [
  'manual_positive_adjustment',
  'manual_negative_adjustment',
  'correction'
] as const

export type ManualStockMovementType =
  (typeof MANUAL_STOCK_MOVEMENT_TYPES)[number]

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entry: 'Entrada',
  sale_exit: 'Saida por venda',
  manual_positive_adjustment: 'Ajuste positivo',
  manual_negative_adjustment: 'Ajuste negativo',
  correction: 'Correcao'
}

export const INVENTORY_IPC_CHANNELS = {
  registerEntry: 'inventory:register-entry',
  registerExit: 'inventory:register-exit',
  registerAdjustment: 'inventory:register-adjustment',
  listHistory: 'inventory:list-history',
  listCurrentStock: 'inventory:list-current-stock',
  listLowStock: 'inventory:list-low-stock'
} as const
