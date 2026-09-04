import React from 'react'
import type { InventoryProduct } from '../../../../shared/types/inventory.types'

type InventoryStockTableProps = {
  products: InventoryProduct[]
  isLoading: boolean
  onAdjust: (product: InventoryProduct) => void
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3
})

const formatQuantity = (quantity: number, unit: string): string =>
  `${quantityFormatter.format(quantity)} ${unit}`

export const InventoryStockTable = ({
  products,
  isLoading,
  onAdjust
}: InventoryStockTableProps): React.JSX.Element => {
  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Carregando estoque...
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Nenhum produto ativo encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-0 overflow-auto border border-slate-800 bg-slate-900/40">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Produto</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Estoque atual</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Estoque minimo</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Situacao</th>
            <th className="border-b border-slate-800 px-4 py-3 text-right font-semibold">Acao</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className={[
                'border-b border-slate-800/80 last:border-b-0',
                product.isLowStock ? 'bg-red-950/30' : 'hover:bg-slate-800/35'
              ].join(' ')}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-slate-100">{product.name}</p>
                <p className="mt-1 text-xs text-slate-500">{product.internalCode}</p>
              </td>
              <td className="px-4 py-3 font-semibold text-slate-100">
                {formatQuantity(product.stockQuantity, product.unitOfMeasure)}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {formatQuantity(product.minimumStockQuantity, product.unitOfMeasure)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-block border px-2 py-1 text-xs font-semibold',
                    product.isLowStock
                      ? 'border-red-500/60 bg-red-500/10 text-red-200'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  ].join(' ')}
                >
                  {product.isLowStock ? 'Estoque baixo' : 'Estoque normal'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onAdjust(product)}
                  className="h-9 border border-amber-400/70 px-3 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/10"
                >
                  Ajustar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
