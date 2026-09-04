import type {
  CashRegister,
  CashRegisterCloseInput,
  CashRegisterOpenInput,
  CashRegisterServiceResponse,
  CashRegisterSummary
} from '../../../../shared/types/cash-register.types'

const getCashRegistersApi = (): Window['hardwareStore']['cashRegisters'] => {
  if (!window.hardwareStore?.cashRegisters) {
    throw new Error('API de caixa indisponivel.')
  }

  return window.hardwareStore.cashRegisters
}

export const cashRegisterApi = {
  open: (
    input: CashRegisterOpenInput
  ): Promise<CashRegisterServiceResponse<CashRegister>> =>
    getCashRegistersApi().open(input),
  close: (
    input: CashRegisterCloseInput
  ): Promise<CashRegisterServiceResponse<CashRegisterSummary>> =>
    getCashRegistersApi().close(input),
  getOpen: (): Promise<CashRegisterServiceResponse<CashRegister | null>> =>
    getCashRegistersApi().getOpen(),
  listPrevious: (): Promise<CashRegisterServiceResponse<CashRegister[]>> =>
    getCashRegistersApi().listPrevious(),
  getCurrentSummary: (): Promise<
    CashRegisterServiceResponse<CashRegisterSummary | null>
  > => getCashRegistersApi().getCurrentSummary()
}
