import React from 'react'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '../../../shared/constants/sales.constants'
import { reportPeriodSchema, salesReportSchema } from '../../../shared/schemas/reports.schema'
import type { CashRegisterReportRow, LowStockReportRow, SalesReport, SalesReportFilters, TopProductReportRow } from '../../../shared/types/reports.types'
import { formatMoney } from '../features/cash-register/cash-register.formatters'
import { reportsApi } from '../features/reports/reports.api'
import { formatReportDate, formatReportQuantity, formatReportTimestamp, initialReportPeriod } from '../features/reports/report.formatters'

const tabs = [
  { id: 'sales', label: 'Vendas' },
  { id: 'topProducts', label: 'Produtos mais vendidos' },
  { id: 'lowStock', label: 'Estoque baixo' },
  { id: 'cashRegisters', label: 'Caixa' }
] as const
type Tab = (typeof tabs)[number]['id']
type Result =
  | { type: 'sales'; data: SalesReport }
  | { type: 'topProducts'; data: TopProductReportRow[] }
  | { type: 'lowStock'; data: LowStockReportRow[] }
  | { type: 'cashRegisters'; data: CashRegisterReportRow[] }
const inputClass = 'rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100'

const ReportTable = ({ headers, rows }: { headers: string[]; rows: { id: number | string; cells: React.ReactNode[] }[] }) => (
  <div className="overflow-x-auto rounded-lg border border-slate-800">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-900 text-slate-300"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-800">{row.cells.map((cell, index) => <td key={headers[index]} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>
)
const Results = ({ result }: { result: Result }) => {
  if (result.type === 'sales') {
    const { data } = result
    return <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">{[
        ['Quantidade de vendas', formatReportQuantity(data.saleCount)],
        ['Total vendido', formatMoney(data.totalSoldInCents)],
        ['Ticket médio', formatMoney(data.averageTicketInCents)]
      ].map(([label, value]) => <article key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>)}</div>
      {data.saleCount === 0 && <p>Nenhuma venda encontrada para os filtros aplicados.</p>}
      <ReportTable headers={['Forma de pagamento', 'Total recebido']} rows={data.totalsByPaymentMethod.map((row) => ({ id: row.method, cells: [PAYMENT_METHOD_LABELS[row.method], formatMoney(row.totalInCents)] }))} />
    </div>
  }
  if (result.data.length === 0) return <p className="rounded-lg border border-slate-800 p-5">{result.type === 'lowStock' ? 'Nenhum produto com estoque baixo.' : result.type === 'topProducts' ? 'Nenhum produto vendido no período.' : 'Nenhum caixa aberto no período selecionado.'}</p>
  if (result.type === 'topProducts') return <ReportTable headers={['Produto', 'Quantidade vendida', 'Valor total vendido']} rows={result.data.map((row) => ({ id: row.productId, cells: [row.productName, formatReportQuantity(row.quantitySold), formatMoney(row.totalSoldInCents)] }))} />
  if (result.type === 'lowStock') return <ReportTable headers={['Produto', 'Estoque atual', 'Estoque mínimo', 'Diferença (quantidade faltante)']} rows={result.data.map((row) => ({ id: row.productId, cells: [row.productName, `${formatReportQuantity(row.stockQuantity)} ${row.unitOfMeasure}`, `${formatReportQuantity(row.minimumStockQuantity)} ${row.unitOfMeasure}`, `${formatReportQuantity(row.missingQuantity)} ${row.unitOfMeasure}`] }))} />
  return <ReportTable headers={['Caixa', 'Data de abertura', 'Data de fechamento', 'Valor inicial', 'Total vendido', 'Valor esperado', 'Valor informado', 'Diferença']} rows={result.data.map((row) => ({ id: row.id, cells: [
    `#${row.id}`, formatReportTimestamp(row.openedAt), formatReportTimestamp(row.closedAt), formatMoney(row.openingAmountInCents), formatMoney(row.totalSoldInCents), formatMoney(row.expectedCashInCents), row.closingAmountInCents === null ? '—' : formatMoney(row.closingAmountInCents), row.differenceInCents === null ? '—' : formatMoney(row.differenceInCents)
  ] }))} />
}

const ReportPanel = ({ tab, active }: { tab: Tab; active: boolean }) => {
  const [filters, setFilters] = React.useState<SalesReportFilters>(initialReportPeriod)
  const currentFilters = React.useRef(filters)
  currentFilters.current = filters
  const [applied, setApplied] = React.useState<SalesReportFilters | null>(null)
  const [result, setResult] = React.useState<Result | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const request = React.useRef(0)
  const generate = React.useCallback(async (input: SalesReportFilters) => {
    const id = ++request.current
    setError('')
    setResult(null)
    setApplied(null)
    setLoading(false)
    if (tab !== 'lowStock') {
      const parsed = (tab === 'sales' ? salesReportSchema : reportPeriodSchema).safeParse(input)
      if (!parsed.success) { setError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    }
    setLoading(true)
    try {
      let next: Result
      if (tab === 'sales') {
        const response = await reportsApi.sales(input)
        if (!response.success) throw new Error(response.issues?.join(' ') || response.error)
        next = { type: tab, data: response.data }
      } else if (tab === 'topProducts') {
        const response = await reportsApi.topProducts(input)
        if (!response.success) throw new Error(response.issues?.join(' ') || response.error)
        next = { type: tab, data: response.data }
      } else if (tab === 'lowStock') {
        const response = await reportsApi.lowStock()
        if (!response.success) throw new Error(response.error)
        next = { type: tab, data: response.data }
      } else {
        const response = await reportsApi.cashRegisters(input)
        if (!response.success) throw new Error(response.issues?.join(' ') || response.error)
        next = { type: tab, data: response.data }
      }
      if (id === request.current) { setResult(next); setApplied(input) }
    } catch (cause) {
      if (id === request.current) setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o relatório. Tente novamente.')
    } finally { if (id === request.current) setLoading(false) }
  }, [tab])
  React.useEffect(() => {
    if (active) void generate(currentFilters.current)
    return () => { request.current++ }
  }, [active, generate])

  return <section hidden={!active} id={`report-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-5">
    <form className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4" onSubmit={(event) => { event.preventDefault(); void generate(filters) }}>
      {tab !== 'lowStock' && <>
        <label className="flex flex-col gap-2 text-sm">Data inicial<input required type="date" aria-label="Data inicial" className={inputClass} value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
        <label className="flex flex-col gap-2 text-sm">Data final<input required type="date" aria-label="Data final" className={inputClass} value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
      </>}
      {tab === 'sales' && <label className="flex flex-col gap-2 text-sm">Forma de pagamento<select aria-label="Forma de pagamento" className={inputClass} value={filters.paymentMethod ?? ''} onChange={(event) => setFilters(event.target.value ? { ...filters, paymentMethod: event.target.value as SalesReportFilters['paymentMethod'] } : { startDate: filters.startDate, endDate: filters.endDate })}>
        <option value="">Todas</option>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
      </select></label>}
      {tab === 'lowStock' && <p className="mr-auto text-sm text-slate-300">Posição atual dos produtos ativos com estoque igual ou inferior ao mínimo.</p>}
      <button type="submit" className="rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">Gerar relatório</button>
    </form>
    {tab === 'sales' && <p className="text-sm text-slate-400">O filtro de pagamento seleciona vendas completas e mostra todas as formas recebidas nessas vendas.</p>}
    {tab === 'topProducts' && <p className="text-sm text-slate-400">Valores líquidos com os descontos da venda distribuídos proporcionalmente entre os itens.</p>}
    {tab === 'cashRegisters' && <p className="text-sm text-slate-400">Período pela data de abertura. Valor esperado = valor inicial + recebimentos em dinheiro.</p>}
    {loading && <p role="status">Carregando relatório…</p>}
    {error && <p role="alert" className="rounded-md border border-red-800 bg-red-950 p-4 text-red-200">{error}</p>}
    {result && applied && <div className="space-y-4" aria-live="polite">
      <p className="text-sm text-slate-400">{tab === 'lowStock' ? 'Filtros aplicados: posição atual do estoque.' : `Filtros aplicados: ${formatReportDate(applied.startDate)} a ${formatReportDate(applied.endDate)}${tab === 'sales' ? ` • ${applied.paymentMethod ? PAYMENT_METHOD_LABELS[applied.paymentMethod] : 'Todas as formas de pagamento'}` : ''}`}</p>
      <Results result={result} />
    </div>}
  </section>
}

export const ReportsPage = (): React.JSX.Element => {
  const [active, setActive] = React.useState<Tab>('sales')
  return <main className="min-w-0 flex-1 space-y-6 bg-slate-950 px-8 py-7 text-slate-100">
    <h1 className="text-2xl font-semibold">Relatórios</h1>
    <div role="tablist" aria-label="Tipos de relatório" className="flex flex-wrap gap-2">{tabs.map((tab, index) => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={active === tab.id} aria-controls={`report-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} onKeyDown={(event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
      if (next !== null) { event.preventDefault(); setActive(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus() }
    }} className={`rounded-md px-4 py-2 text-sm font-medium ${active === tab.id ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>{tab.label}</button>)}</div>
    {tabs.map((tab) => <ReportPanel key={tab.id} tab={tab.id} active={active === tab.id} />)}
  </main>
}
