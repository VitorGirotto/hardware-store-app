import React from 'react'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '../../../../shared/constants/sales.constants'
import { buttonClass, fieldClass, formatMoney, moneyInput, parseMoney, type DraftPayment } from './sales-draft'

type Props = { payments: DraftPayment[]; totalInCents: number; disabled: boolean; onChange: (payments: DraftPayment[]) => void }
export const SalePayments = ({ payments, totalInCents, disabled, onChange }: Props): React.JSX.Element => {
  const paid = payments.reduce((sum, payment) => sum + parseMoney(payment.amount), 0)
  const remaining = totalInCents - paid
  const update = (index: number, value: Partial<DraftPayment>) => onChange(payments.map((payment, i) => i === index ? { ...payment, ...value } : payment))
  return <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">Pagamentos</h2>
      <button type="button" className={buttonClass} disabled={disabled || !Number.isFinite(remaining) || remaining <= 0} onClick={() => onChange([...payments, { method: 'cash', amount: moneyInput(remaining) }])}>Adicionar pagamento</button>
    </div>
    {payments.length === 0 ? <p className="mb-3 text-sm text-slate-400">{totalInCents === 0 ? 'Venda sem valor a pagar.' : 'Adicione os pagamentos para finalizar.'}</p> : null}
    <div className="space-y-3">{payments.map((payment, index) => <div key={index} className="flex items-end gap-2">
      <label className="min-w-0 flex-1 text-xs text-slate-400">Forma de pagamento<select className={`${fieldClass} mt-1`} disabled={disabled} value={payment.method} onChange={(event) => update(index, { method: event.target.value as PaymentMethod })}>
        {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
      </select></label>
      <label className="min-w-0 flex-1 text-xs text-slate-400">Valor (R$)<input className={`${fieldClass} mt-1`} disabled={disabled} inputMode="decimal" value={payment.amount} onChange={(event) => update(index, { amount: event.target.value })} /></label>
      <button type="button" className={buttonClass} disabled={disabled} aria-label={`Remover pagamento ${index + 1}`} onClick={() => onChange(payments.filter((_, i) => i !== index))}>×</button>
    </div>)}</div>
    <dl className="mt-4 flex flex-wrap justify-between gap-3 text-sm"><div>Pago <strong className="ml-2">{formatMoney(paid)}</strong></div><div>{remaining < 0 ? 'Excedente' : 'Restante'} <strong className={remaining !== 0 ? 'ml-2 text-amber-300' : 'ml-2 text-emerald-300'}>{formatMoney(Math.abs(remaining))}</strong></div></dl>
    <p className="mt-2 text-xs text-slate-400">A soma deve ser igual ao total. Pagamento sem troco.</p>
  </section>
}
