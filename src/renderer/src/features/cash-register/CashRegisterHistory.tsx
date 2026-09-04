import React from 'react'
import type { CashRegister } from '../../../../shared/types/cash-register.types'
import { formatDateTime, formatMoney } from './cash-register.formatters'

type CashRegisterHistoryProps = {
  cashRegisters: CashRegister[]
  isLoading: boolean
}

export const CashRegisterHistory = ({
  cashRegisters,
  isLoading
}: CashRegisterHistoryProps): React.JSX.Element => (
  <section className="space-y-3">
    <div>
      <h2 className="text-lg font-semibold text-slate-100">Histórico de caixas</h2>
      <p className="mt-1 text-sm text-slate-400">
        {cashRegisters.length} sessões fechadas
      </p>
    </div>

    <div className="max-h-[420px] overflow-auto border border-slate-800 bg-slate-900/40">
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-slate-300">
          Carregando histórico...
        </div>
      ) : cashRegisters.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center text-sm text-slate-300">
          Nenhum caixa fechado.
        </div>
      ) : (
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="border-b border-slate-800 px-4 py-3">Abertura</th>
              <th className="border-b border-slate-800 px-4 py-3">Fechamento</th>
              <th className="border-b border-slate-800 px-4 py-3">Inicial</th>
              <th className="border-b border-slate-800 px-4 py-3">Informado</th>
              <th className="border-b border-slate-800 px-4 py-3">Diferença</th>
              <th className="border-b border-slate-800 px-4 py-3">Observação</th>
            </tr>
          </thead>
          <tbody>
            {cashRegisters.map((cashRegister) => {
              const difference = cashRegister.differenceInCents

              return (
                <tr key={cashRegister.id} className="border-b border-slate-800/80 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {formatDateTime(cashRegister.openedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {cashRegister.closedAt ? formatDateTime(cashRegister.closedAt) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatMoney(cashRegister.openingAmountInCents)}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {cashRegister.closingAmountInCents === null
                      ? '-'
                      : formatMoney(cashRegister.closingAmountInCents)}
                  </td>
                  <td
                    className={[
                      'px-4 py-3 font-semibold',
                      difference === null
                        ? 'text-slate-400'
                        : difference === 0
                        ? 'text-emerald-300'
                        : difference < 0
                          ? 'text-red-300'
                          : 'text-amber-300'
                    ].join(' ')}
                  >
                    {difference === null ? '-' : formatMoney(difference)}
                  </td>
                  <td className="max-w-72 px-4 py-3 text-slate-400">
                    {cashRegister.notes || '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  </section>
)
