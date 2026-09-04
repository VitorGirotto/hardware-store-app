import React from 'react'
import type { CashRegisterSummary } from '../../../../shared/types/cash-register.types'
import { cashRegisterApi } from './cash-register.api'
import { formatMoney, parseMoneyInput } from './cash-register.formatters'

type CloseCashRegisterFormProps = {
  summary: CashRegisterSummary
  onClosed: (summary: CashRegisterSummary) => void
  onError: (message: string) => void
}

export const CloseCashRegisterForm = ({
  summary,
  onClosed,
  onError
}: CloseCashRegisterFormProps): React.JSX.Element => {
  const [closingAmount, setClosingAmount] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [amountToConfirm, setAmountToConfirm] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const requestConfirmation = (
    event: React.FormEvent<HTMLFormElement>
  ): void => {
    event.preventDefault()
    setError(null)
    const closingAmountInCents = parseMoneyInput(closingAmount)

    if (closingAmountInCents === null || closingAmountInCents < 0) {
      const message = 'Informe um valor contado valido e nao negativo.'
      setError(message)
      onError(message)
      return
    }

    setAmountToConfirm(closingAmountInCents)
  }

  const confirmClose = async (): Promise<void> => {
    if (amountToConfirm === null) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const result = await cashRegisterApi.close({
        cashRegisterId: summary.cashRegister.id,
        closingAmountInCents: amountToConfirm,
        notes
      })

      if (result.success) {
        onClosed(result.data)
        return
      }

      const message = [result.error, ...(result.issues ?? [])].join(' ')
      setError(message)
      setAmountToConfirm(null)
      onError(result.error)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Falha inesperada.'
      setError(message)
      setAmountToConfirm(null)
      onError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const differenceInCents = amountToConfirm === null
    ? 0
    : amountToConfirm - summary.expectedCashInCents

  return (
    <form
      onSubmit={requestConfirmation}
      className="border border-slate-800 bg-slate-900/60"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-100">Fechar caixa</h2>
        <p className="mt-1 text-sm text-slate-400">
          Conte o dinheiro físico antes de concluir.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {error ? (
          <div className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-200">
          Valor contado (R$)
          <input
            value={closingAmount}
            onChange={(event) => {
              setClosingAmount(event.target.value)
              setAmountToConfirm(null)
            }}
            inputMode="decimal"
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Observação
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-y border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
            placeholder="Opcional"
          />
        </label>

        {amountToConfirm !== null ? (
          <div className="space-y-3 border border-amber-400/50 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-100">
              Confirme o fechamento. Esta operação não poderá ser desfeita.
            </p>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Esperado</dt>
                <dd className="mt-1 font-semibold text-slate-100">
                  {formatMoney(summary.expectedCashInCents)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Informado</dt>
                <dd className="mt-1 font-semibold text-slate-100">
                  {formatMoney(amountToConfirm)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Diferença</dt>
                <dd
                  className={[
                    'mt-1 font-semibold',
                    differenceInCents === 0
                      ? 'text-emerald-300'
                      : differenceInCents < 0
                        ? 'text-red-300'
                        : 'text-amber-300'
                  ].join(' ')}
                >
                  {formatMoney(differenceInCents)}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAmountToConfirm(null)}
                disabled={isSaving}
                className="h-9 border border-slate-600 px-3 text-sm font-semibold text-slate-100"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={() => void confirmClose()}
                disabled={isSaving}
                className="h-9 border border-red-400 bg-red-500 px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? 'Fechando...' : 'Confirmar fechamento'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {amountToConfirm === null ? (
        <div className="flex justify-end border-t border-slate-800 px-5 py-4">
          <button
            type="submit"
            className="h-10 border border-red-400 bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Conferir fechamento
          </button>
        </div>
      ) : null}
    </form>
  )
}
