import React from 'react'
import type { Product } from '../../../shared/types/product.types'
import { ProductForm } from '../features/products/ProductForm'
import { ProductSearch } from '../features/products/ProductSearch'
import { ProductTable } from '../features/products/ProductTable'
import { productApi } from '../features/products/product.api'

type Notice = {
  type: 'success' | 'error'
  text: string
}

type Toast = Notice

export const ProductsPage = (): React.JSX.Element => {
  const [products, setProducts] = React.useState<Product[]>([])
  const [query, setQuery] = React.useState('')
  const [includeInactive, setIncludeInactive] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [toast, setToast] = React.useState<Toast | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const toastTimeoutRef = React.useRef<number | null>(null)

  const showToast = React.useCallback((nextToast: Toast): void => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }

    setToast(nextToast)
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimeoutRef.current = null
    }, 3200)
  }, [])

  const loadProducts = React.useCallback(async (): Promise<void> => {
    setIsLoading(true)

    try {
      const result = await productApi.list({
        query: query.trim() || undefined,
        includeInactive
      })

      if (result.success) {
        setProducts(result.data)
        return
      }

      setNotice({
        type: 'error',
        text: result.error
      })
      showToast({
        type: 'error',
        text: 'Erro ao carregar produtos'
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro inesperado ao carregar produtos.'
      })
      showToast({
        type: 'error',
        text: 'Erro ao carregar produtos'
      })
    } finally {
      setIsLoading(false)
    }
  }, [includeInactive, query, showToast])

  React.useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const openNewProductForm = (): void => {
    setEditingProduct(null)
    setIsFormOpen(true)
    setNotice(null)
  }

  const handleEdit = (product: Product): void => {
    setEditingProduct(product)
    setIsFormOpen(true)
    setNotice(null)
  }

  const handleSaved = (product: Product): void => {
    const isEditing = Boolean(editingProduct)
    const successMessage = isEditing ? 'Produto atualizado' : 'Produto cadastrado'

    setNotice({
      type: 'success',
      text: `${successMessage}: ${product.name}.`
    })
    showToast({
      type: 'success',
      text: successMessage
    })
    setEditingProduct(null)
    setIsFormOpen(false)
    void loadProducts()
  }

  const handleInactivate = async (product: Product): Promise<void> => {
    try {
      const result = await productApi.inactivate(product.id)

      if (result.success) {
        setNotice({
          type: 'success',
          text: `Produto ${result.data.name} inativado.`
        })
        showToast({
          type: 'success',
          text: 'Produto inativado'
        })
        void loadProducts()
        return
      }

      setNotice({
        type: 'error',
        text: result.error
      })
      showToast({
        type: 'error',
        text: 'Erro ao inativar'
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro inesperado ao inativar.'
      })
      showToast({
        type: 'error',
        text: 'Erro ao inativar'
      })
    }
  }

  const activeProducts = products.filter((product) => product.isActive).length
  const lowStockProducts = products.filter(
    (product) =>
      product.isActive && product.stockQuantity <= product.minimumStockQuantity
  ).length

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Produtos</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="border border-slate-700 px-3 py-1.5">
                {products.length} cadastrados
              </span>
              <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                {activeProducts} ativos
              </span>
              <span className="border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-red-200">
                {lowStockProducts} estoque baixo
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col gap-4">
          <ProductSearch
            initialQuery={query}
            includeInactive={includeInactive}
            isLoading={isLoading}
            onSearch={setQuery}
            onIncludeInactiveChange={setIncludeInactive}
            onNewProduct={openNewProductForm}
          />

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

          <ProductTable
            products={products}
            isLoading={isLoading}
            onEdit={handleEdit}
            onInactivate={(product) => void handleInactivate(product)}
          />
        </section>

        {isFormOpen ? (
          <aside className="min-h-[640px] xl:min-h-0">
            <ProductForm
              product={editingProduct}
              onCancel={() => {
                setEditingProduct(null)
                setIsFormOpen(false)
              }}
              onError={(message) =>
                showToast({
                  type: 'error',
                  text: message
                })
              }
              onSaved={handleSaved}
            />
          </aside>
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          className={[
            'fixed bottom-6 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 border px-5 py-3 text-center text-sm font-semibold shadow-2xl',
            toast.type === 'success'
              ? 'border-emerald-400 bg-emerald-500 text-slate-950'
              : 'border-red-400 bg-red-500 text-white'
          ].join(' ')}
        >
          {toast.text}
        </div>
      ) : null}
    </main>
  )
}
