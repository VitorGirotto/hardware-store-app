import React from 'react'
import {
  STOCK_MOVEMENT_LABELS,
  STOCK_MOVEMENT_TYPES,
  type StockMovementType
} from '../../../../shared/constants/inventory.constants'
import type { StockMovement } from '../../../../shared/types/inventory.types'

type InventoryHistoryProps = {
  movements: StockMovement[]
  isLoading: boolean
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
  signDisplay: 'always'
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
})

export const InventoryHistory = ({
  movements,
  isLoading
}: InventoryHistoryProps): React.JSX.Element => {
  const [productId, setProductId] = React.useState('')
  const [type, setType] = React.useState<StockMovementType | ''>('')
  const productOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          movements.map((movement) => [
            movement.productId,
            { id: movement.productId, name: movement.productName }
          ])
        ).values()
      ).sort((first, second) => first.name.localeCompare(second.name)),
    [movements]
  )
  const filteredMovements = movements.filter(
    (movement) =>
      (!productId || movement.productId === Number(productId)) &&
      (!type || movement.type === type)
  )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Historico de movimentacoes</h2>
          <p className="mt-1 text-sm text-slate-400">{filteredMovements.length} registros</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            aria-label="Filtrar historico por produto"
            className="h-10 min-w-48 border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-amber-400"
          >
            <option value="">Todos os produtos</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(event) => setType(event.target.value as StockMovementType | '')}
            aria-label="Filtrar historico por tipo"
            className="h-10 min-w-48 border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-amber-400"
          >
            <option value="">Todos os tipos</option>
            {STOCK_MOVEMENT_TYPES.map((movementType) => (
              <option key={movementType} value={movementType}>
                {STOCK_MOVEMENT_LABELS[movementType]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto border border-slate-800 bg-slate-900/40">
        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-slate-300">
            Carregando historico...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-slate-300">
            Nenhuma movimentacao encontrada.
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Data</th>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Produto</th>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Tipo</th>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Quantidade</th>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Motivo</th>
                <th className="border-b border-slate-800 px-4 py-3 font-semibold">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-slate-800/80 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {dateFormatter.format(new Date(movement.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{movement.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">{movement.productInternalCode}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {STOCK_MOVEMENT_LABELS[movement.type]}
                  </td>
                  <td
                    className={[
                      'px-4 py-3 font-semibold',
                      movement.quantity < 0 ? 'text-red-300' : 'text-emerald-300'
                    ].join(' ')}
                  >
                    {quantityFormatter.format(movement.quantity)} {movement.productUnitOfMeasure}
                  </td>
                  <td className="max-w-64 px-4 py-3 text-slate-300">{movement.reason}</td>
                  <td className="px-4 py-3 text-slate-400">{movement.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
