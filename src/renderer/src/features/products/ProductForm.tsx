import React from 'react'
import { PRODUCT_UNITS, type ProductUnit } from '../../../../shared/constants/product.constants'
import type { Product, ProductCreateInput } from '../../../../shared/types/product.types'
import { productApi } from './product.api'

type ProductFormProps = {
  product: Product | null
  onCancel: () => void
  onError: (message: string) => void
  onSaved: (product: Product) => void
}

type ProductFormState = {
  name: string
  internalCode: string
  barcode: string
  ncm: string
  category: string
  unitOfMeasure: ProductUnit
  costPrice: string
  salePrice: string
  stockQuantity: string
  minimumStockQuantity: string
  isActive: boolean
}

const centsToInput = (valueInCents: number): string => (valueInCents / 100).toFixed(2)

const numberToInput = (value: number): string => String(value)

const textOrNull = (value: string): string | null => {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const parseDecimalInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')

  if (!normalized) {
    return 0
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseMoneyInput = (value: string): number | null => {
  const parsed = parseDecimalInput(value)
  return parsed === null ? null : Math.round(parsed * 100)
}

const createInitialState = (product: Product | null): ProductFormState => ({
  name: product?.name ?? '',
  internalCode: product?.internalCode ?? '',
  barcode: product?.barcode ?? '',
  ncm: product?.ncm ?? '',
  category: product?.category ?? '',
  unitOfMeasure: product?.unitOfMeasure ?? 'Un',
  costPrice: product ? centsToInput(product.costPriceInCents) : '0.00',
  salePrice: product ? centsToInput(product.salePriceInCents) : '0.00',
  stockQuantity: product ? numberToInput(product.stockQuantity) : '0',
  minimumStockQuantity: product ? numberToInput(product.minimumStockQuantity) : '0',
  isActive: product?.isActive ?? true
})

export const ProductForm = ({
  product,
  onCancel,
  onError,
  onSaved
}: ProductFormProps): React.JSX.Element => {
  const [form, setForm] = React.useState<ProductFormState>(() =>
    createInitialState(product)
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setForm(createInitialState(product))
    setError(null)
  }, [product])

  const updateField = <Field extends keyof ProductFormState>(
    field: Field,
    value: ProductFormState[Field]
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const buildPayload = (): ProductCreateInput | null => {
    const costPriceInCents = parseMoneyInput(form.costPrice)
    const salePriceInCents = parseMoneyInput(form.salePrice)
    const stockQuantity = parseDecimalInput(form.stockQuantity)
    const minimumStockQuantity = parseDecimalInput(form.minimumStockQuantity)

    if (
      costPriceInCents === null ||
      salePriceInCents === null ||
      stockQuantity === null ||
      minimumStockQuantity === null
    ) {
      setError('Preencha valores numericos validos.')
      onError(product ? 'Erro ao atualizar' : 'Erro ao cadastrar')
      return null
    }

    return {
      name: form.name,
      internalCode: form.internalCode,
      barcode: textOrNull(form.barcode),
      ncm: textOrNull(form.ncm),
      category: textOrNull(form.category),
      unitOfMeasure: form.unitOfMeasure,
      costPriceInCents,
      salePriceInCents,
      stockQuantity,
      minimumStockQuantity,
      isActive: form.isActive
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    const payload = buildPayload()

    if (!payload) {
      return
    }

    setIsSaving(true)

    try {
      const result = product
        ? await productApi.update(product.id, payload)
        : await productApi.create(payload)

      if (result.success) {
        onSaved(result.data)
        return
      }

      setError([result.error, ...(result.issues ?? [])].join(' '))
      onError(product ? 'Erro ao atualizar' : 'Erro ao cadastrar')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada.'
      setError(message)
      onError(product ? 'Erro ao atualizar' : 'Erro ao cadastrar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="flex h-full flex-col border border-slate-800 bg-slate-900/70" onSubmit={handleSubmit}>
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-100">
          {product ? 'Editar produto' : 'Novo produto'}
        </h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error ? (
          <div className="border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-200">
          Nome
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Codigo interno
            <input
              value={form.internalCode}
              onChange={(event) => updateField('internalCode', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Codigo de barras
            <input
              value={form.barcode}
              onChange={(event) => updateField('barcode', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            NCM
            <input
              value={form.ncm}
              onChange={(event) => updateField('ncm', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Categoria
            <input
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-200">
          Unidade de medida
          <select
            value={form.unitOfMeasure}
            onChange={(event) => updateField('unitOfMeasure', event.target.value as ProductUnit)}
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          >
            {PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Preco de custo
            <input
              value={form.costPrice}
              onChange={(event) => updateField('costPrice', event.target.value)}
              inputMode="decimal"
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Preco de venda
            <input
              value={form.salePrice}
              onChange={(event) => updateField('salePrice', event.target.value)}
              inputMode="decimal"
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-200">
            Estoque atual
            <input
              value={form.stockQuantity}
              onChange={(event) => updateField('stockQuantity', event.target.value)}
              inputMode="decimal"
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Estoque minimo
            <input
              value={form.minimumStockQuantity}
              onChange={(event) => updateField('minimumStockQuantity', event.target.value)}
              inputMode="decimal"
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField('isActive', event.target.checked)}
            className="size-4 accent-amber-400"
          />
          Produto ativo
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
          disabled={isSaving}
          className="h-10 border border-amber-300 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
