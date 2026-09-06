import React from 'react'
import { createPortal } from 'react-dom'
import { STORE_NAME } from '../../../../shared/constants/store.constants'
import { PAYMENT_METHOD_LABELS } from '../../../../shared/constants/sales.constants'
import type { Sale } from '../../../../shared/types/sales.types'
import { formatMoney } from './sales-draft'
import './sale-receipt.css'

type Props = { sale: Sale; onClose: () => void }

export const SaleReceipt = ({ sale, onClose }: Props): React.JSX.Element | null => {
  const dialog = React.useRef<HTMLDialogElement>(null)
  React.useEffect(() => {
    const element = dialog.current
    if (sale.status !== 'paid' || !element) return
    element.showModal()
    return () => element.close()
  }, [sale.id, sale.status])

  if (sale.status !== 'paid') return null
  // SQLite CURRENT_TIMESTAMP has no suffix, but represents UTC. Display local time.
  const timestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(sale.createdAt)
    ? `${sale.createdAt.replace(' ', 'T')}Z`
    : sale.createdAt
  const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp))
  const quantity = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 })

  return createPortal(
    <dialog ref={dialog} className="sale-receipt-dialog" aria-labelledby="sale-receipt-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="sale-receipt-actions">
        <button type="button" onClick={() => window.print()}>Imprimir recibo</button>
        <button autoFocus type="button" onClick={onClose}>Fechar recibo</button>
      </div>
      <header className="sale-receipt-header">
        <h2 id="sale-receipt-title">{STORE_NAME}</h2>
        <p>Recibo da venda #{sale.id}</p>
        <p>Data: <time dateTime={timestamp}>{date}</time></p>
      </header>
      <table className="sale-receipt-items">
        <caption>Itens da venda</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">Qtd.</th><th scope="col">Preço unit.</th><th scope="col">Total</th></tr></thead>
        <tbody>{sale.items.map((item) => <tr key={item.id}>
          <td>{item.productName}{item.discountInCents > 0 ? <small>Desconto: {formatMoney(item.discountInCents)}</small> : null}</td>
          <td>{quantity.format(item.quantity)}</td>
          <td>{formatMoney(item.unitPriceInCents)}</td>
          <td>{formatMoney(item.totalInCents)}</td>
        </tr>)}</tbody>
      </table>
      <dl className="sale-receipt-totals">
        <div><dt>Subtotal após descontos dos itens</dt><dd>{formatMoney(sale.subtotalInCents)}</dd></div>
        {sale.discountInCents > 0 ? <div><dt>Desconto adicional</dt><dd>{formatMoney(sale.discountInCents)}</dd></div> : null}
        <div className="sale-receipt-total"><dt>Total da venda</dt><dd>{formatMoney(sale.totalInCents)}</dd></div>
      </dl>
      <section className="sale-receipt-payments" aria-label="Formas de pagamento">
        <h3>Forma de pagamento</h3>
        {sale.payments.length === 0 ? <p>Sem pagamento (total zero).</p> : <dl>{sale.payments.map((payment) =>
          <div key={payment.id}><dt>{PAYMENT_METHOD_LABELS[payment.method]}</dt><dd>{formatMoney(payment.amountInCents)}</dd></div>
        )}</dl>}
      </section>
    </dialog>,
    document.body
  )
}
