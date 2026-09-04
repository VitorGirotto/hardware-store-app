import type { CashRegisterStatus } from '../constants/cash-register.constants'

export type CashRegister = {
  id: number
  openedAt: string
  closedAt: string | null
  openingAmountInCents: number
  closingAmountInCents: number | null
  differenceInCents: number | null
  status: CashRegisterStatus
  notes: string | null
}

export type CashRegisterOpenInput = {
  openingAmountInCents: number
}

export type CashRegisterCloseInput = {
  cashRegisterId: number
  closingAmountInCents: number
  notes?: string | null
}

export type CashRegisterSummary = {
  cashRegister: CashRegister
  totalSoldInCents: number
  cashPaymentsInCents: number
  expectedCashInCents: number
}

export type CashRegisterServiceResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      issues?: string[]
    }
