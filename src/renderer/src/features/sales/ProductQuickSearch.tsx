import React from 'react'
import type { Product } from '../../../../shared/types/product.types'
import { productApi } from '../products/product.api'
import { buttonClass, fieldClass, formatMoney } from './sales-draft'

type Props = { disabled: boolean; refreshKey: number; onAdd: (product: Product) => void }
export const ProductQuickSearch = ({ disabled, refreshKey, onAdd }: Props): React.JSX.Element => {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const request = React.useRef(0)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const search = React.useCallback(async (term: string) => {
    const current = ++request.current
    setLoading(true)
    setError(null)
    try {
      const response = await productApi.list({ query: term, includeInactive: false })
      if (current !== request.current) return
      if (!response.success) throw new Error(response.error)
      setResults(response.data)
    } catch (error) {
      if (current === request.current) {
        setResults([])
        setError(error instanceof Error ? error.message : 'Não foi possível buscar produtos.')
      }
    } finally {
      if (current === request.current) setLoading(false)
    }
  }, [])
  React.useEffect(() => {
    // Invalidate immediately, including the time spent waiting for the debounce.
    request.current++
    setLoading(true)
    timer.current = setTimeout(() => void search(query), 250)
    return () => { clearTimeout(timer.current); request.current++ }
  }, [query, refreshKey, search])
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="mb-3 font-semibold">Adicionar produtos</h2>
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault()
        clearTimeout(timer.current)
        void search(query)
      }}>
        <input autoFocus aria-label="Buscar produto" className={fieldClass} placeholder="Nome, código interno, barras ou categoria" value={query} disabled={disabled}
          onChange={(event) => { request.current++; setLoading(true); setQuery(event.target.value) }} />
        <button className={buttonClass} disabled={disabled} type="submit">Buscar</button>
      </form>
      <div aria-live="polite" className="mt-3 text-sm text-slate-400">
        {loading ? 'Buscando produtos...' : error ? <span className="text-red-300">{error}</span> : results.length === 0 ? 'Nenhum produto encontrado.' : `${results.length} produto(s)`}
      </div>
      {!loading && !error ? <ul className="mt-3 max-h-96 divide-y divide-slate-800 overflow-y-auto">
        {results.map((product) => <li key={product.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="break-words font-medium">{product.name}</p>
            <p className="text-xs text-slate-400">{product.internalCode} · {product.category || 'Sem categoria'}</p>
            <p className="mt-1 text-sm">{formatMoney(product.salePriceInCents)} <span className="text-slate-400">/ {product.unitOfMeasure} · Estoque: {product.stockQuantity}</span></p>
          </div>
          <button type="button" className={buttonClass} disabled={disabled || product.stockQuantity <= 0} onClick={() => onAdd(product)} aria-label={`Adicionar ${product.name}`}>Adicionar</button>
        </li>)}
      </ul> : null}
    </section>
  )
}
