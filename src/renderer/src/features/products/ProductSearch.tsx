import React from 'react'

type ProductSearchProps = {
  initialQuery: string
  includeInactive: boolean
  isLoading: boolean
  onSearch: (query: string) => void
  onIncludeInactiveChange: (includeInactive: boolean) => void
  onNewProduct: () => void
}

export const ProductSearch = ({
  initialQuery,
  includeInactive,
  isLoading,
  onSearch,
  onIncludeInactiveChange,
  onNewProduct
}: ProductSearchProps): React.JSX.Element => {
  const [query, setQuery] = React.useState(initialQuery)

  React.useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  return (
    <form
      className="flex flex-wrap items-center gap-3 border border-slate-800 bg-slate-900/70 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(query)
      }}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-10 min-w-72 flex-1 border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-amber-400"
        placeholder="Nome, codigo interno ou barras"
      />

      <label className="flex h-10 items-center gap-2 border border-slate-700 px-3 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(event) => onIncludeInactiveChange(event.target.checked)}
          className="size-4 accent-amber-400"
        />
        Inativos
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="h-10 border border-amber-300 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Buscar
      </button>

      <button
        type="button"
        onClick={onNewProduct}
        className="h-10 border border-emerald-400 bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
      >
        Novo produto
      </button>
    </form>
  )
}
