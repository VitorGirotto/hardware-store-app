import React from 'react'
import type { Customer, CustomerCreateInput } from '../../../../shared/types/customer.types'
import { customerApi } from './customer.api'

type CustomerFormProps = {
  customer: Customer | null
  onCancel: () => void
  onError: (message: string) => void
  onSaved: (customer: Customer) => void
}

type CustomerFormState = {
  name: string
  document: string
  phone: string
  address: string
  creditLimit: string
  isActive: boolean
}

const centsToInput = (valueInCents: number): string => (valueInCents / 100).toFixed(2)

const textOrNull = (value: string): string | null => {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const parseMoneyInput = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')

  if (!normalized) {
    return 0
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

const createInitialState = (customer: Customer | null): CustomerFormState => ({
  name: customer?.name ?? '',
  document: customer?.document ?? '',
  phone: customer?.phone ?? '',
  address: customer?.address ?? '',
  creditLimit: customer ? centsToInput(customer.creditLimitInCents) : '0.00',
  isActive: customer?.isActive ?? true
})

export const CustomerForm = ({
  customer,
  onCancel,
  onError,
  onSaved
}: CustomerFormProps): React.JSX.Element => {
  const [form, setForm] = React.useState<CustomerFormState>(() =>
    createInitialState(customer)
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setForm(createInitialState(customer))
    setError(null)
  }, [customer])

  const updateField = <Field extends keyof CustomerFormState>(
    field: Field,
    value: CustomerFormState[Field]
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const buildPayload = (): CustomerCreateInput | null => {
    const creditLimitInCents = parseMoneyInput(form.creditLimit)

    if (creditLimitInCents === null) {
      setError('Preencha um limite de credito valido.')
      onError(customer ? 'Erro ao atualizar' : 'Erro ao cadastrar')
      return null
    }

    return {
      name: form.name,
      document: textOrNull(form.document),
      phone: textOrNull(form.phone),
      address: textOrNull(form.address),
      creditLimitInCents,
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
      const result = customer
        ? await customerApi.update(customer.id, payload)
        : await customerApi.create(payload)

      if (result.success) {
        onSaved(result.data)
        return
      }

      setError([result.error, ...(result.issues ?? [])].join(' '))
      onError(customer ? 'Erro ao atualizar' : 'Erro ao cadastrar')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha inesperada.'
      setError(message)
      onError(customer ? 'Erro ao atualizar' : 'Erro ao cadastrar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="flex h-full flex-col border border-slate-800 bg-slate-900/70" onSubmit={handleSubmit}>
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-100">
          {customer ? 'Editar cliente' : 'Novo cliente'}
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
            Documento
            <input
              value={form.document}
              onChange={(event) => updateField('document', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Telefone
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-200">
          Limite de credito
          <input
            value={form.creditLimit}
            onChange={(event) => updateField('creditLimit', event.target.value)}
            inputMode="decimal"
            className="mt-1 h-10 w-full border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Endereco
          <textarea
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
            className="mt-1 min-h-24 w-full resize-y border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => updateField('isActive', event.target.checked)}
            className="size-4 accent-amber-400"
          />
          Cliente ativo
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
