export const PRODUCT_UNITS = ['Un', 'Kg', 'Metro'] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export const DEFAULT_PRODUCT_UNIT: ProductUnit = 'Un'

export const PRODUCT_IPC_CHANNELS = {
  create: 'products:create',
  list: 'products:list',
  getById: 'products:get-by-id',
  searchByName: 'products:search-by-name',
  update: 'products:update',
  inactivate: 'products:inactivate',
  checkDuplicateCodes: 'products:check-duplicate-codes'
} as const
