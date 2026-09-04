import type { z } from 'zod'
import {
  cashRegisterCloseSchema,
  cashRegisterOpenSchema
} from '../../shared/schemas/cash-register.schema'
import type {
  CashRegister,
  CashRegisterCloseInput,
  CashRegisterOpenInput,
  CashRegisterServiceResponse,
  CashRegisterSummary
} from '../../shared/types/cash-register.types'
import * as cashRegisterRepository from '../repositories/cash-register.repository'

const success = <T>(data: T): CashRegisterServiceResponse<T> => ({
  success: true,
  data
})

const failure = <T = never>(
  error: string,
  issues?: string[]
): CashRegisterServiceResponse<T> => ({
  success: false,
  error,
  issues
})

const validationFailure = <T>(
  error: z.ZodError
): CashRegisterServiceResponse<T> =>
  failure(
    'Dados do caixa invalidos.',
    error.issues.map((issue) => issue.message)
  )

const toBusinessError = (
  error: unknown,
  fallback: string
): CashRegisterServiceResponse<never> => {
  if (error instanceof Error) {
    if (
      error.message.includes('cash_registers_single_open_idx') ||
      error.message.includes('cash_registers.status')
    ) {
      return failure('Ja existe um caixa aberto.')
    }

    if (error.message.includes('CASH_REGISTER_HAS_OPEN_SALES')) {
      return failure('Existem vendas abertas vinculadas a este caixa.')
    }

    if (error.message) {
      return failure(error.message)
    }
  }

  return failure(fallback)
}

export const calculateExpectedCash = (
  openingAmountInCents: number,
  cashPaymentsInCents: number
): number => openingAmountInCents + cashPaymentsInCents

export const calculateDifference = (
  closingAmountInCents: number,
  expectedCashInCents: number
): number => closingAmountInCents - expectedCashInCents

const buildSummary = (cashRegister: CashRegister): CashRegisterSummary => {
  const totals = cashRegisterRepository.getCashRegisterTotals(cashRegister.id)

  return {
    cashRegister,
    ...totals,
    expectedCashInCents: calculateExpectedCash(
      cashRegister.openingAmountInCents,
      totals.cashPaymentsInCents
    )
  }
}

export const openCashRegister = (
  input: unknown
): CashRegisterServiceResponse<CashRegister> => {
  const parsed = cashRegisterOpenSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    if (cashRegisterRepository.findOpenCashRegister()) {
      return failure('Ja existe um caixa aberto.')
    }

    return success(
      cashRegisterRepository.openCashRegister(
        parsed.data as CashRegisterOpenInput
      )
    )
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel abrir o caixa.')
  }
}

export const closeCashRegister = (
  input: unknown
): CashRegisterServiceResponse<CashRegisterSummary> => {
  const parsed = cashRegisterCloseSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  const closeInput = parsed.data as CashRegisterCloseInput

  try {
    const cashRegister = cashRegisterRepository.findCashRegisterById(
      closeInput.cashRegisterId
    )

    if (!cashRegister) {
      return failure('Caixa nao encontrado.')
    }

    if (cashRegister.status === 'closed') {
      return failure('Este caixa ja esta fechado.')
    }

    if (cashRegisterRepository.hasOpenSales(cashRegister.id)) {
      return failure('Existem vendas abertas vinculadas a este caixa.')
    }

    const totals = cashRegisterRepository.getCashRegisterTotals(cashRegister.id)
    const expectedCashInCents = calculateExpectedCash(
      cashRegister.openingAmountInCents,
      totals.cashPaymentsInCents
    )
    const differenceInCents = calculateDifference(
      closeInput.closingAmountInCents,
      expectedCashInCents
    )
    const closed = cashRegisterRepository.closeCashRegister(cashRegister.id, {
      closingAmountInCents: closeInput.closingAmountInCents,
      differenceInCents,
      notes: closeInput.notes ?? null
    })

    if (!closed) {
      return failure('Este caixa ja esta fechado.')
    }

    return success({
      cashRegister: closed,
      ...totals,
      expectedCashInCents
    })
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel fechar o caixa.')
  }
}

export const getOpenCashRegister = (): CashRegisterServiceResponse<CashRegister | null> => {
  try {
    return success(cashRegisterRepository.findOpenCashRegister() ?? null)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel buscar o caixa aberto.')
  }
}

export const listPreviousCashRegisters = (): CashRegisterServiceResponse<CashRegister[]> => {
  try {
    return success(cashRegisterRepository.listClosedCashRegisters())
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel listar os caixas anteriores.')
  }
}

export const getCurrentCashRegisterSummary = (): CashRegisterServiceResponse<CashRegisterSummary | null> => {
  try {
    const cashRegister = cashRegisterRepository.findOpenCashRegister()
    return success(cashRegister ? buildSummary(cashRegister) : null)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel obter o resumo do caixa.')
  }
}
