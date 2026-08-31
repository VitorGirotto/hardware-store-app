import React from 'react'
import type { Customer } from '../../../../shared/types/customer.types'

type CustomerTableProps = {
  customers: Customer[]
  isLoading: boolean
  onEdit: (customer: Customer) => void
  onInactivate: (customer: Customer) => void
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatMoney = (valueInCents: number): string =>
  moneyFormatter.format(valueInCents / 100)

export const CustomerTable = ({
  customers,
  isLoading,
  onEdit,
  onInactivate
}: CustomerTableProps): React.JSX.Element => {
  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Carregando clientes...
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Nenhum cliente encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-0 overflow-auto border border-slate-800 bg-slate-900/40">
      <table className="min-w-[920px] w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Cliente</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Contato</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Endereco</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Limite</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Status</th>
            <th className="border-b border-slate-800 px-4 py-3 text-right font-semibold">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="border-b border-slate-800/80 transition last:border-b-0 hover:bg-slate-800/35"
            >
              <td className="px-4 py-3 align-top">
                <p className="font-medium text-slate-100">{customer.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {customer.document || 'Sem documento'}
                </p>
              </td>
              <td className="px-4 py-3 align-top text-slate-300">
                {customer.phone || '-'}
              </td>
              <td className="max-w-xs px-4 py-3 align-top text-slate-300">
                <span className="line-clamp-2">{customer.address || '-'}</span>
              </td>
              <td className="px-4 py-3 align-top font-medium text-slate-100">
                {formatMoney(customer.creditLimitInCents)}
              </td>
              <td className="px-4 py-3 align-top">
                <span
                  className={[
                    'border px-2 py-1 text-xs font-semibold',
                    customer.isActive
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  ].join(' ')}
                >
                  {customer.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(customer)}
                    className="h-9 border border-slate-600 px-3 text-xs font-semibold text-slate-100 transition hover:border-amber-400 hover:text-amber-200"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onInactivate(customer)}
                    disabled={!customer.isActive}
                    className="h-9 border border-red-500/70 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                  >
                    Inativar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
