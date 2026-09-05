export const SALE_STATUSES = ['open', 'paid', 'cancelled'] as const
export const PAYMENT_METHODS = ['cash', 'debit_card', 'credit_card', 'pix'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro', debit_card: 'Débito', credit_card: 'Crédito', pix: 'Pix'
}
export const SALES_IPC_CHANNELS = { finalize: 'sales:finalize' } as const
