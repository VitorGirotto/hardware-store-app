import React from 'react'
import type { Product } from '../../../../shared/types/product.types'

type ProductTableProps = {
  products: Product[]
  isLoading: boolean
  onEdit: (product: Product) => void
  onInactivate: (product: Product) => void
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3
})

const formatMoney = (valueInCents: number): string =>
  moneyFormatter.format(valueInCents / 100)

const formatQuantity = (product: Product): string =>
  `${quantityFormatter.format(product.stockQuantity)} ${product.unitOfMeasure}`

const isLowStock = (product: Product): boolean =>
  product.isActive && product.stockQuantity <= product.minimumStockQuantity

export const ProductTable = ({
  products,
  isLoading,
  onEdit,
  onInactivate
}: ProductTableProps): React.JSX.Element => {
  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Carregando produtos...
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center border border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        Nenhum produto encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-0 overflow-auto border border-slate-800 bg-slate-900/40">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Produto</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Codigos</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Categoria</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Venda</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Estoque</th>
            <th className="border-b border-slate-800 px-4 py-3 font-semibold">Status</th>
            <th className="border-b border-slate-800 px-4 py-3 text-right font-semibold">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const lowStock = isLowStock(product)

            return (
              <tr
                key={product.id}
                className={[
                  'border-b border-slate-800/80 transition last:border-b-0',
                  lowStock ? 'bg-red-950/30' : 'hover:bg-slate-800/35'
                ].join(' ')}
              >
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-slate-100">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">NCM {product.ncm || '-'}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-slate-200">{product.internalCode}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.barcode || 'Sem barras'}</p>
                </td>
                <td className="px-4 py-3 align-top text-slate-300">
                  {product.category || '-'}
                </td>
                <td className="px-4 py-3 align-top font-medium text-slate-100">
                  {formatMoney(product.salePriceInCents)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-100">{formatQuantity(product)}</span>
                    <span
                      className={[
                        'w-fit border px-2 py-0.5 text-xs font-semibold',
                        lowStock
                          ? 'border-red-400 bg-red-500/15 text-red-200'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      ].join(' ')}
                    >
                      {lowStock ? 'Estoque baixo' : 'Estoque ok'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={[
                      'border px-2 py-1 text-xs font-semibold',
                      product.isActive
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-600 bg-slate-800 text-slate-300'
                    ].join(' ')}
                  >
                    {product.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="h-9 border border-slate-600 px-3 text-xs font-semibold text-slate-100 transition hover:border-amber-400 hover:text-amber-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onInactivate(product)}
                      disabled={!product.isActive}
                      className="h-9 border border-red-500/70 px-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                    >
                      Inativar
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
