import React from 'react'
import type { CashRegisterSummary } from '../../../shared/types/cash-register.types'
import { cashRegisterApi } from '../features/cash-register/cash-register.api'
import { formatDateTime, formatMoney } from '../features/cash-register/cash-register.formatters'

export const DashboardPage = (): React.JSX.Element => {
  const [summary, setSummary] = React.useState<CashRegisterSummary | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadSummary = React.useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await cashRegisterApi.getCurrentSummary()

      if (!result.success) {
        throw new Error(result.error)
      }

      setSummary(result.data)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Erro inesperado ao consultar o caixa.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const items = [
    [
      'Status',
      isLoading
        ? 'Consultando...'
        : error
          ? 'Indisponível'
          : summary
            ? 'Caixa aberto'
            : 'Caixa fechado'
    ],
    ['Data/hora de abertura', summary ? formatDateTime(summary.cashRegister.openedAt) : '—'],
    ['Valor inicial', summary ? formatMoney(summary.cashRegister.openingAmountInCents) : '—'],
    ['Total vendido', summary ? formatMoney(summary.totalSoldInCents) : '—']
  ]

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-8 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">Visão geral da operação atual</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={isLoading}
            className="h-10 border border-slate-600 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:opacity-60"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="space-y-5 px-8 py-6">
        {error ? (
          <div className="border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-semibold">Situação do caixa</h2>
            {!isLoading ? (
              <span
                className={[
                  'size-2.5 rounded-full',
                  summary ? 'bg-emerald-400' : 'bg-slate-500'
                ].join(' ')}
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map(([label, value], index) => (
              <div
                key={label}
                className={[
                  'border bg-slate-900/60 px-5 py-5',
                  index === 0 && summary
                    ? 'border-emerald-500/40'
                    : 'border-slate-800'
                ].join(' ')}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
