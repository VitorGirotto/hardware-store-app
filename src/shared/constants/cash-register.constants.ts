export const CASH_REGISTER_STATUSES = ['open', 'closed'] as const

export type CashRegisterStatus = (typeof CASH_REGISTER_STATUSES)[number]

export const CASH_REGISTER_IPC_CHANNELS = {
  open: 'cash-register:open',
  close: 'cash-register:close',
  getOpen: 'cash-register:get-open',
  listPrevious: 'cash-register:list-previous',
  getCurrentSummary: 'cash-register:get-current-summary'
} as const
