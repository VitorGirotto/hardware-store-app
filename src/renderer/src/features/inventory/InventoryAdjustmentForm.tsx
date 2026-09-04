import React from 'react'
import {
  STOCK_MOVEMENT_LABELS,
  type ManualStockMovementType
} from '../../../../shared/constants/inventory.constants'
import type {
  InventoryProduct,
  StockAdjustmentInput,
  StockMovement
} from '../../../../shared/types/inventory.types'
import { inventoryApi } from './inventory.api'

type InventoryAdjustmentFormProps = {
  products: InventoryProduct[]
  selectedProduct: InventoryProduct | null
  onCancel: () => void
  onError: (message: string) => void
  onSaved: (movement: StockMovement) => void
}

const parseQuantity = (value: string): number | null => {
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export const InventoryAdjustmentForm = ({
  products,
  selectedProduct,
  onCancel,
  onError,
  onSaved
}: InventoryAdjustmentFormProps): React.JSX.Element => {
  const [productId, setProductId] = React.useState(String(selectedProduct?.id ?? products[0]?.id ?? ''))
  const [type, setType] = React.useState<ManualStockMovementType>('manual_positive_adjustment')
  const [quantity, setQuantity] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setProductId(String(selectedProduct?.id ?? products[0]?.id ?? ''))
  }, [products, selectedProduct])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    const parsedProductId = Number(productId)
    const parsedQuantity = parseQuantity(quantity)

    if (!Number.isInteger(parsedProductId) || parsedQuantity === null) {
      const message = 'Informe produto e quantidade validos.'
      setError(message)
      onError(message)
      return
    }

    const payload: StockAdjustmentInput = {
      productId: parsedProductId,
      type,
      quantity: parsedQuantity,
      reason,
      reference: reference.trim() || null
    }

    setIsSaving(true)

    try {
      const result = await inventoryApi.registerAdjustment(payload)

      if (result.success) {
        onSaved(result.data)
        return
      }

      const message = [result.error, ...(result.issues ?? [])].join(' ')
      setError(message)
      onError(message)
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
      className="flex h-full flex-col border-l border-slate-700 bg-slate-900 shadow-2xl"
      onSubmit={handleSubmit}
    >
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-100">Ajuste manual</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {error ? (
          <div className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-200">
          Produto
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.internalCode})
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-200">Operacao</legend>
          <div className="grid grid-cols-3 border border-slate-700">
            {([
              'manual_positive_adjustment',
              'manual_negative_adjustment',
              'correction'
            ] as const).map((movementType) => (
              <button
                key={movementType}
                type="button"
                onClick={() => setType(movementType)}
                className={[
                  'min-h-11 border-r border-slate-700 px-2 text-xs font-semibold last:border-r-0',
                  type === movementType
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                ].join(' ')}
              >
                {STOCK_MOVEMENT_LABELS[movementType]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-slate-200">
          {type === 'correction' ? 'Saldo contado' : 'Quantidade'}
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="decimal"
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Motivo
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-none border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Referencia
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 border border-slate-600 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving || products.length === 0}
          className="h-10 border border-amber-300 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Salvando...' : 'Registrar'}
        </button>
      </div>
    </form>
  )
}
