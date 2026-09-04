import React from 'react'
import type { CashRegisterSummary as CashRegisterSummaryData } from '../../../../shared/types/cash-register.types'
import { formatDateTime, formatMoney } from './cash-register.formatters'

type CashRegisterSummaryProps = {
  summary: CashRegisterSummaryData
}

export const CashRegisterSummary = ({
  summary
}: CashRegisterSummaryProps): React.JSX.Element => {
  const items = [
    ['Abertura', formatDateTime(summary.cashRegister.openedAt)],
    ['Valor inicial', formatMoney(summary.cashRegister.openingAmountInCents)],
    ['Total vendido', formatMoney(summary.totalSoldInCents)],
    ['Vendas em dinheiro', formatMoney(summary.cashPaymentsInCents)],
    ['Esperado em caixa', formatMoney(summary.expectedCashInCents)]
  ]

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Resumo atual</h2>
        <p className="mt-1 text-sm text-slate-400">
          Somente vendas pagas entram nos totais.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-slate-900/60 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
