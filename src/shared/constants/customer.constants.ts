export const CUSTOMER_IPC_CHANNELS = {
  create: 'customers:create',
  list: 'customers:list',
  getById: 'customers:get-by-id',
  searchByName: 'customers:search-by-name',
  update: 'customers:update',
  inactivate: 'customers:inactivate',
  checkDuplicateDocument: 'customers:check-duplicate-document'
} as const
