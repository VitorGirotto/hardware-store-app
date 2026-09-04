import React from 'react'
import type {
  InventoryProduct,
  StockMovement
} from '../../../shared/types/inventory.types'
import { InventoryAdjustmentForm } from '../features/inventory/InventoryAdjustmentForm'
import { InventoryHistory } from '../features/inventory/InventoryHistory'
import { InventoryStockTable } from '../features/inventory/InventoryStockTable'
import { inventoryApi } from '../features/inventory/inventory.api'

type Notice = {
  type: 'success' | 'error'
  text: string
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3
})

export const InventoryPage = (): React.JSX.Element => {
  const [products, setProducts] = React.useState<InventoryProduct[]>([])
  const [lowStockProducts, setLowStockProducts] = React.useState<InventoryProduct[]>([])
  const [movements, setMovements] = React.useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [selectedProduct, setSelectedProduct] = React.useState<InventoryProduct | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const loadInventory = React.useCallback(async (): Promise<void> => {
    setIsLoading(true)

    try {
      const [stockResult, lowStockResult, historyResult] = await Promise.all([
        inventoryApi.listCurrentStock(),
        inventoryApi.listLowStock(),
        inventoryApi.listHistory()
      ])

      if (!stockResult.success) {
        throw new Error(stockResult.error)
      }

      if (!lowStockResult.success) {
        throw new Error(lowStockResult.error)
      }

      if (!historyResult.success) {
        throw new Error(historyResult.error)
      }

      setProducts(stockResult.data)
      setLowStockProducts(lowStockResult.data)
      setMovements(historyResult.data)
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro inesperado ao carregar o estoque.'
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  const openAdjustment = (product: InventoryProduct | null): void => {
    setSelectedProduct(product)
    setIsFormOpen(true)
    setNotice(null)
  }

  const handleSaved = (movement: StockMovement): void => {
    setNotice({
      type: 'success',
      text: `Movimentacao registrada para ${movement.productName}.`
    })
    setIsFormOpen(false)
    setSelectedProduct(null)
    void loadInventory()
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Estoque</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="border border-slate-700 px-3 py-1.5">
                {products.length} produtos ativos
              </span>
              <span className="border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-red-200">
                {lowStockProducts.length} abaixo do minimo
              </span>
              <span className="border border-slate-700 px-3 py-1.5">
                {movements.length} movimentacoes
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openAdjustment(products[0] ?? null)}
            disabled={products.length === 0}
            className="h-10 border border-amber-300 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ajuste manual
          </button>
        </div>
      </div>

      <div className="space-y-7 px-8 py-6">
        {notice ? (
          <div
            className={[
              'border px-4 py-3 text-sm',
              notice.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                : 'border-red-500/60 bg-red-500/10 text-red-100'
            ].join(' ')}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Estoque atual</h2>
              <p className="mt-1 text-sm text-slate-400">Saldo dos produtos ativos</p>
            </div>
            <InventoryStockTable
              products={products}
              isLoading={isLoading}
              onAdjust={openAdjustment}
            />
          </section>

          <section className="border border-red-500/30 bg-red-950/10">
            <div className="border-b border-red-500/20 px-4 py-3">
              <h2 className="text-base font-semibold text-red-100">Abaixo do estoque minimo</h2>
            </div>
            <div className="max-h-[380px] divide-y divide-slate-800 overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-6 text-sm text-slate-400">Carregando...</p>
              ) : lowStockProducts.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400">Nenhum produto em alerta.</p>
              ) : (
                lowStockProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openAdjustment(product)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-red-500/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {product.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Minimo {quantityFormatter.format(product.minimumStockQuantity)} {product.unitOfMeasure}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-red-200">
                      {quantityFormatter.format(product.stockQuantity)} {product.unitOfMeasure}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <InventoryHistory movements={movements} isLoading={isLoading} />
      </div>

      {isFormOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar ajuste manual"
            onClick={() => setIsFormOpen(false)}
            className="fixed inset-0 z-30 bg-black/50"
          />
          <aside className="fixed bottom-0 right-0 top-16 z-40 w-[min(100vw,420px)]">
            <InventoryAdjustmentForm
              products={products}
              selectedProduct={selectedProduct}
              onCancel={() => setIsFormOpen(false)}
              onError={(message) => setNotice({ type: 'error', text: message })}
              onSaved={handleSaved}
            />
          </aside>
        </>
      ) : null}
    </main>
  )
}
