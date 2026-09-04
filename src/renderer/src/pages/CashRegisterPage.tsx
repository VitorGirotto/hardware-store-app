import React from 'react'
import type {
  CashRegister,
  CashRegisterSummary as CashRegisterSummaryData
} from '../../../shared/types/cash-register.types'
import { CashRegisterHistory } from '../features/cash-register/CashRegisterHistory'
import { CashRegisterSummary } from '../features/cash-register/CashRegisterSummary'
import { CloseCashRegisterForm } from '../features/cash-register/CloseCashRegisterForm'
import { OpenCashRegisterForm } from '../features/cash-register/OpenCashRegisterForm'
import { cashRegisterApi } from '../features/cash-register/cash-register.api'

type Notice = {
  type: 'success' | 'error'
  text: string
}

export const CashRegisterPage = (): React.JSX.Element => {
  const [summary, setSummary] = React.useState<CashRegisterSummaryData | null>(null)
  const [history, setHistory] = React.useState<CashRegister[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<Notice | null>(null)

  const loadCashRegister = React.useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [summaryResult, historyResult] = await Promise.all([
        cashRegisterApi.getCurrentSummary(),
        cashRegisterApi.listPrevious()
      ])

      if (!summaryResult.success) {
        throw new Error(summaryResult.error)
      }

      if (!historyResult.success) {
        throw new Error(historyResult.error)
      }

      setSummary(summaryResult.data)
      setHistory(historyResult.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao carregar o caixa.'
      setLoadError(message)
      setNotice({
        type: 'error',
        text: message
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCashRegister()
  }, [loadCashRegister])

  const handleOpened = (_cashRegister: CashRegister): void => {
    setNotice({ type: 'success', text: 'Caixa aberto com sucesso.' })
    void loadCashRegister()
  }

  const handleClosed = (closedSummary: CashRegisterSummaryData): void => {
    const difference = closedSummary.cashRegister.differenceInCents ?? 0
    setNotice({
      type: 'success',
      text: difference === 0
        ? 'Caixa fechado sem diferença.'
        : 'Caixa fechado. Confira a diferença registrada no histórico.'
    })
    void loadCashRegister()
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Caixa</h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span
                className={[
                  'border px-3 py-1.5 font-semibold',
                  summary
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-600 bg-slate-800 text-slate-300'
                ].join(' ')}
              >
                {isLoading ? 'Consultando...' : summary ? 'Caixa aberto' : 'Caixa fechado'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadCashRegister()}
            disabled={isLoading}
            className="h-10 border border-slate-600 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-60"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="space-y-7 px-8 py-6">
        {notice ? (
          <div
            className={[
              'border px-4 py-3 text-sm',
              notice.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                : 'border-red-500/60 bg-red-500/10 text-red-100'
            ].join(' ')}
          >
            {notice.text}
          </div>
        ) : null}

        {!isLoading && !loadError && summary ? (
          <>
            <CashRegisterSummary summary={summary} />
            <div className="max-w-xl">
              <CloseCashRegisterForm
                summary={summary}
                onClosed={handleClosed}
                onError={(message) => setNotice({ type: 'error', text: message })}
              />
            </div>
          </>
        ) : !isLoading && !loadError ? (
          <div className="max-w-xl">
            <OpenCashRegisterForm
              onOpened={handleOpened}
              onError={(message) => setNotice({ type: 'error', text: message })}
            />
          </div>
        ) : null}

        <CashRegisterHistory cashRegisters={history} isLoading={isLoading} />
      </div>
    </main>
  )
}
