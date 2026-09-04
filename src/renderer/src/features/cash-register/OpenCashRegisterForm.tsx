import React from 'react'
import type { CashRegister } from '../../../../shared/types/cash-register.types'
import { cashRegisterApi } from './cash-register.api'
import { parseMoneyInput } from './cash-register.formatters'

type OpenCashRegisterFormProps = {
  onError: (message: string) => void
  onOpened: (cashRegister: CashRegister) => void
}

export const OpenCashRegisterForm = ({
  onError,
  onOpened
}: OpenCashRegisterFormProps): React.JSX.Element => {
  const [openingAmount, setOpeningAmount] = React.useState('0.00')
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault()
    setError(null)
    const openingAmountInCents = parseMoneyInput(openingAmount)

    if (openingAmountInCents === null || openingAmountInCents < 0) {
      const message = 'Informe um valor inicial valido e nao negativo.'
      setError(message)
      onError(message)
      return
    }

    setIsSaving(true)

    try {
      const result = await cashRegisterApi.open({ openingAmountInCents })

      if (result.success) {
        onOpened(result.data)
        return
      }

      const message = [result.error, ...(result.issues ?? [])].join(' ')
      setError(message)
      onError(result.error)
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Falha inesperada.'
      setError(message)
      onError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-slate-800 bg-slate-900/60"
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-100">Abrir caixa</h2>
        <p className="mt-1 text-sm text-slate-400">
          Informe o dinheiro disponível no início da sessão.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {error ? (
          <div className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-200">
          Valor inicial (R$)
          <input
            value={openingAmount}
            onChange={(event) => setOpeningAmount(event.target.value)}
            inputMode="decimal"
            autoFocus
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-slate-800 px-5 py-4">
        <button
          type="submit"
          disabled={isSaving}
          className="h-10 border border-amber-300 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Abrindo...' : 'Abrir caixa'}
        </button>
      </div>
    </form>
  )
}
