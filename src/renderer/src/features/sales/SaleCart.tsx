import React from 'react'
import { calculateSaleTotals } from '../../../../shared/utils/sales'
import { buttonClass, fieldClass, formatMoney, parseMoney, parseQuantity, type CartItem } from './sales-draft'

type Props = { items: CartItem[]; disabled: boolean; onChange: (items: CartItem[]) => void }
export const SaleCart = ({ items, disabled, onChange }: Props): React.JSX.Element => {
  const update = (index: number, field: 'quantity' | 'unitPrice' | 'discount', value: string) => onChange(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  return <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
    <h2 className="mb-3 font-semibold">Carrinho <span className="text-slate-400">({items.length})</span></h2>
    {items.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Busque um produto para começar a venda.</p> : <div className="space-y-4">
      {items.map((item, index) => {
        let total = NaN
        try {
          total = calculateSaleTotals([{ productId: item.product.id, quantity: parseQuantity(item.quantity), unitPriceInCents: parseMoney(item.unitPrice), discountInCents: parseMoney(item.discount) }], 0).totalInCents
        } catch { /* Incomplete fields remain editable. */ }
        return <article key={item.product.id} className="border-t border-slate-800 pt-3 first:border-0 first:pt-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 className="font-medium">{item.product.name}</h3><p className="text-xs text-slate-400">{item.product.internalCode} · {item.product.unitOfMeasure}</p></div>
            <button type="button" className={buttonClass} disabled={disabled} aria-label={`Remover ${item.product.name}`} onClick={() => onChange(items.filter((_, i) => i !== index))}>Remover</button>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <label className="text-xs text-slate-400">Quantidade<input className={`${fieldClass} mt-1`} inputMode="decimal" value={item.quantity} disabled={disabled} onChange={(event) => update(index, 'quantity', event.target.value)} /></label>
            <label className="text-xs text-slate-400">Preço unitário (R$)<input className={`${fieldClass} mt-1`} inputMode="decimal" value={item.unitPrice} disabled={disabled} onChange={(event) => update(index, 'unitPrice', event.target.value)} /></label>
            <label className="text-xs text-slate-400">Desconto do item (R$)<input className={`${fieldClass} mt-1`} inputMode="decimal" value={item.discount} disabled={disabled} onChange={(event) => update(index, 'discount', event.target.value)} /></label>
            <div className="text-xs text-slate-400">Total do item<p className="mt-3 text-base font-semibold text-slate-100">{formatMoney(total)}</p></div>
          </div>
        </article>
      })}
    </div>}
  </section>
}
