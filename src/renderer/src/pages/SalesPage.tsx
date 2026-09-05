import React from 'react'
import type { Customer } from '../../../shared/types/customer.types'
import type { Product } from '../../../shared/types/product.types'
import type { CashRegisterSummary } from '../../../shared/types/cash-register.types'
import { saleFinalizeSchema } from '../../../shared/schemas/sales.schema'
import { calculateSaleTotals, stockAfterSale } from '../../../shared/utils/sales'
import { cashRegisterApi } from '../features/cash-register/cash-register.api'
import { customerApi } from '../features/customers/customer.api'
import { productApi } from '../features/products/product.api'
import { ProductQuickSearch } from '../features/sales/ProductQuickSearch'
import { SaleCart } from '../features/sales/SaleCart'
import { SalePayments } from '../features/sales/SalePayments'
import { salesApi } from '../features/sales/sales.api'
import { addProduct, buttonClass, draftToInput, emptySalesDraft, fieldClass, formatMoney, type SalesDraft } from '../features/sales/sales-draft'

type Props = {
  draft: SalesDraft
  setDraft: React.Dispatch<React.SetStateAction<SalesDraft>>
  submitting: boolean
  setSubmitting: (value: boolean) => void
  onOpenCashRegister: () => void
}
export const SalesPage = ({ draft, setDraft, submitting, setSubmitting, onOpenCashRegister }: Props): React.JSX.Element => {
  const [summary, setSummary] = React.useState<CashRegisterSummary | null>(null)
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [available, setAvailable] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<{ success: boolean; text: string } | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const locked = React.useRef(false)
  const contextRequest = React.useRef(0)

  const loadContext = React.useCallback(async () => {
    const request = ++contextRequest.current
    setLoading(true)
    setLoadError(null)
    try {
      const [cash, customerResult, productResult] = await Promise.all([
        cashRegisterApi.getCurrentSummary(), customerApi.list({ includeInactive: false }), productApi.list({ includeInactive: false })
      ])
      if (request !== contextRequest.current) return
      if (!cash.success) throw new Error(cash.error)
      if (!customerResult.success) throw new Error(customerResult.error)
      if (!productResult.success) throw new Error(productResult.error)
      setSummary(cash.data)
      setCustomers(customerResult.data)
      setAvailable(productResult.data)
    } catch (error) {
      if (request === contextRequest.current) setLoadError(error instanceof Error ? error.message : 'Não foi possível atualizar o PDV.')
    } finally {
      if (request === contextRequest.current) setLoading(false)
    }
  }, [])
  React.useEffect(() => {
    void loadContext()
    return () => { contextRequest.current++ }
  }, [loadContext])

  const input = draftToInput(draft, summary?.cashRegister.id ?? 0)
  let totals: ReturnType<typeof calculateSaleTotals> | null = null
  let totalsError: string | null = null
  try { totals = calculateSaleTotals(input.items, input.discountInCents) }
  catch (error) { totalsError = error instanceof Error ? error.message : 'Revise os valores.' }
  const validation = saleFinalizeSchema.safeParse(input)
  const availabilityError = draft.items.map((item, index) => {
    const product = available.find((product) => product.id === item.product.id)
    if (!product) return `${item.product.name}: produto indisponível ou inativo.`
    try { stockAfterSale(product.stockQuantity, input.items[index].quantity) }
    catch { return `${product.name}: confira a quantidade. Estoque disponível de ${product.stockQuantity} ${product.unitOfMeasure}.` }
    return null
  }).find(Boolean)
  const customerError = draft.customerId && !customers.some((customer) => customer.id === Number(draft.customerId))
    ? 'O cliente selecionado está indisponível. Selecione outro cliente ou venda sem cliente.' : null
  const disabled = submitting || loading
  const canFinalize = !disabled && !loadError && summary && validation.success && !availabilityError && !customerError

  const finalize = async () => {
    if (locked.current || !canFinalize || !validation.success) return
    locked.current = true
    setSubmitting(true)
    setNotice(null)
    try {
      const response = await salesApi.finalize(validation.data)
      if (!response.success) {
        setNotice({ success: false, text: [response.error, ...(response.issues ?? [])].join(' ') })
        await loadContext()
        setRefreshKey((value) => value + 1)
        return
      }
      setDraft(emptySalesDraft())
      setConfirmCancel(false)
      setNotice({ success: true, text: `Venda #${response.data.id} finalizada com sucesso. Total: ${formatMoney(response.data.totalInCents)}.` })
      // Refresh errors are separate: a committed sale must never be shown as failed.
      await loadContext()
      setRefreshKey((value) => value + 1)
    } catch (error) {
      setNotice({ success: false, text: error instanceof Error ? error.message : 'Não foi possível comunicar com o serviço de vendas.' })
    } finally {
      locked.current = false
      setSubmitting(false)
    }
  }

  return <main className="min-w-0 flex-1 overflow-y-auto bg-slate-950 px-6 py-6 text-slate-100">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Ponto de venda</h1><p className="mt-1 text-sm text-slate-400">Adicione os itens, confira os valores e finalize a venda.</p></div>
      <div className="flex items-center gap-3"><span className={`rounded px-3 py-2 text-sm ${summary && !loadError ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>{loading ? 'Consultando caixa...' : loadError ? 'Caixa indisponível' : summary ? `Caixa #${summary.cashRegister.id} aberto` : 'Caixa fechado'}</span>
        <button type="button" disabled={disabled} className={buttonClass} onClick={() => { void loadContext(); setRefreshKey((value) => value + 1) }}>Atualizar</button></div>
    </header>
    {notice ? <div role={notice.success ? 'status' : 'alert'} className={`mb-4 rounded border p-3 text-sm ${notice.success ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-red-500/40 bg-red-500/10 text-red-100'}`}>{notice.text}</div> : null}
    {loadError ? <p role="alert" className="mb-4 text-red-300">{loadError} Use Atualizar para tentar novamente.</p> : null}
    {!loading && !loadError && !summary ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200"><p>Abra um caixa para finalizar vendas. Seu carrinho será mantido.</p><button type="button" className={buttonClass} onClick={onOpenCashRegister}>Ir para Caixa</button></div> : null}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
      <div className="space-y-5">
        <ProductQuickSearch disabled={submitting} refreshKey={refreshKey} onAdd={(product) => { setConfirmCancel(false); setDraft((current) => addProduct(current, product)) }} />
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"><label className="text-sm font-semibold">Cliente <span className="font-normal text-slate-400">(opcional)</span><select className={`${fieldClass} mt-3`} value={draft.customerId} disabled={disabled} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value }))}>
          <option value="">Venda sem cliente</option>
          {customerError ? <option value={draft.customerId}>Cliente indisponível</option> : null}
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.document ? ` · ${customer.document}` : ''}</option>)}
        </select></label>{customerError ? <p className="mt-2 text-sm text-red-300">{customerError}</p> : null}</section>
        {summary ? <section className="rounded-lg border border-slate-800 p-4 text-sm"><h2 className="mb-3 font-semibold">Resumo do caixa</h2><dl className="space-y-2"><div className="flex justify-between gap-3"><dt>Vendido</dt><dd>{formatMoney(summary.totalSoldInCents)}</dd></div><div className="flex justify-between gap-3"><dt>Dinheiro esperado</dt><dd>{formatMoney(summary.expectedCashInCents)}</dd></div></dl></section> : null}
      </div>
      <div className="space-y-5">
        <SaleCart items={draft.items} disabled={submitting} onChange={(items) => { setConfirmCancel(false); setDraft((current) => ({ ...current, items })) }} />
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex justify-between gap-3 text-sm"><span>Subtotal após descontos dos itens</span><strong>{formatMoney(totals?.subtotalInCents ?? (draft.items.length === 0 ? 0 : NaN))}</strong></div>
          <label className="flex items-center justify-between gap-3 text-sm">Desconto adicional (R$)<input className={`${fieldClass} max-w-36`} inputMode="decimal" disabled={submitting} value={draft.discount} onChange={(event) => setDraft((current) => ({ ...current, discount: event.target.value }))} /></label>
          <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4"><h2 className="text-lg font-semibold">Total</h2><strong className="text-3xl text-amber-300">{formatMoney(totals?.totalInCents ?? (draft.items.length === 0 ? 0 : NaN))}</strong></div>
          {draft.items.length > 0 && totalsError ? <p role="alert" className="mt-3 text-sm text-red-300">{totalsError}</p> : null}
          {!loading && availabilityError ? <p role="alert" className="mt-3 text-sm text-red-300">{availabilityError}</p> : null}
        </section>
        <SalePayments payments={draft.payments} totalInCents={totals?.totalInCents ?? (draft.items.length === 0 ? 0 : NaN)} disabled={submitting} onChange={(payments) => setDraft((current) => ({ ...current, payments }))} />
        {draft.items.length > 0 && totals && !validation.success && summary ? <p className="text-sm text-amber-200">Confira os pagamentos: informe valores positivos que somem exatamente o total da venda.</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="min-h-12 flex-1 rounded bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canFinalize} onClick={() => void finalize()}>{submitting ? 'Finalizando...' : 'Finalizar venda'}</button>
          <button type="button" className={buttonClass} disabled={submitting} onClick={() => {
            if (draft.items.length > 0) setConfirmCancel(true)
            else { setDraft(emptySalesDraft()); setNotice(null) }
          }}>Cancelar venda atual</button>
        </div>
        {confirmCancel ? <section role="alertdialog" aria-label="Cancelar venda atual" aria-describedby="cancel-sale-description" className="rounded border border-amber-400/40 bg-slate-900 p-4"><p id="cancel-sale-description" className="text-sm">Descartar todos os itens e pagamentos desta venda?</p><div className="mt-3 flex gap-3"><button autoFocus type="button" className={buttonClass} disabled={submitting} onClick={() => setConfirmCancel(false)}>Continuar venda</button><button type="button" className={buttonClass} disabled={submitting} onClick={() => { setDraft(emptySalesDraft()); setConfirmCancel(false); setNotice({ success: true, text: 'Venda atual cancelada.' }) }}>Descartar venda</button></div></section> : null}
      </div>
    </div>
  </main>
}
