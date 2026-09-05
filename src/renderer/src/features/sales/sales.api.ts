import type { Sale, SaleFinalizeInput, SaleServiceResponse } from '../../../../shared/types/sales.types'

export const salesApi = {
  finalize: (input: SaleFinalizeInput): Promise<SaleServiceResponse<Sale>> => {
    if (!window.hardwareStore?.sales) throw new Error('API de vendas indisponível.')
    return window.hardwareStore.sales.finalize(input)
  }
}
