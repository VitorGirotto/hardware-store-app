import React from 'react'
import type { Customer } from '../../../shared/types/customer.types'
import { CustomerForm } from '../features/customers/CustomerForm'
import { CustomerSearch } from '../features/customers/CustomerSearch'
import { CustomerTable } from '../features/customers/CustomerTable'
import { customerApi } from '../features/customers/customer.api'

type Notice = {
  type: 'success' | 'error'
  text: string
}

type Toast = Notice

export const CustomersPage = (): React.JSX.Element => {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [query, setQuery] = React.useState('')
  const [includeInactive, setIncludeInactive] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const [toast, setToast] = React.useState<Toast | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null)
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

  const loadCustomers = React.useCallback(async (): Promise<void> => {
    setIsLoading(true)

    try {
      const result = await customerApi.list({
        query: query.trim() || undefined,
        includeInactive
      })

      if (result.success) {
        setCustomers(result.data)
        return
      }

      setNotice({
        type: 'error',
        text: result.error
      })
      showToast({
        type: 'error',
        text: 'Erro ao carregar clientes'
      })
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro inesperado ao carregar clientes.'
      })
      showToast({
        type: 'error',
        text: 'Erro ao carregar clientes'
      })
    } finally {
      setIsLoading(false)
    }
  }, [includeInactive, query, showToast])

  React.useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  React.useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const openNewCustomerForm = (): void => {
    setEditingCustomer(null)
    setIsFormOpen(true)
    setNotice(null)
  }

  const handleEdit = (customer: Customer): void => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
    setNotice(null)
  }

  const handleSaved = (customer: Customer): void => {
    const isEditing = Boolean(editingCustomer)
    const successMessage = isEditing ? 'Cliente atualizado' : 'Cliente cadastrado'

    setNotice({
      type: 'success',
      text: `${successMessage}: ${customer.name}.`
    })
    showToast({
      type: 'success',
      text: successMessage
    })
    setEditingCustomer(null)
    setIsFormOpen(false)
    void loadCustomers()
  }

  const handleInactivate = async (customer: Customer): Promise<void> => {
    try {
      const result = await customerApi.inactivate(customer.id)

      if (result.success) {
        setNotice({
          type: 'success',
          text: `Cliente ${result.data.name} inativado.`
        })
        showToast({
          type: 'success',
          text: 'Cliente inativado'
        })
        void loadCustomers()
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

  const activeCustomers = customers.filter((customer) => customer.isActive).length
  const inactiveCustomers = customers.length - activeCustomers

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-8 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Clientes</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="border border-slate-700 px-3 py-1.5">
                {customers.length} cadastrados
              </span>
              <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
                {activeCustomers} ativos
              </span>
              <span className="border border-slate-600 bg-slate-800 px-3 py-1.5 text-slate-300">
                {inactiveCustomers} inativos
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col gap-4">
          <CustomerSearch
            initialQuery={query}
            includeInactive={includeInactive}
            isLoading={isLoading}
            onSearch={setQuery}
            onIncludeInactiveChange={setIncludeInactive}
            onNewCustomer={openNewCustomerForm}
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

          <CustomerTable
            customers={customers}
            isLoading={isLoading}
            onEdit={handleEdit}
            onInactivate={(customer) => void handleInactivate(customer)}
          />
        </section>

        {isFormOpen ? (
          <aside className="min-h-130 xl:min-h-0">
            <CustomerForm
              customer={editingCustomer}
              onCancel={() => {
                setEditingCustomer(null)
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
