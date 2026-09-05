// UI smoke-test fixture. Database behavior is covered by sales.service.test.ts.
const { contextBridge } = require('electron')
const products = [
  { id: 1, name: 'Martelo unha', internalCode: 'MAR-01', barcode: '789100', category: 'Ferragens', unitOfMeasure: 'Un', salePriceInCents: 2500, stockQuantity: 10, isActive: true },
  { id: 2, name: 'Cabo flexível', internalCode: 'CAB-02', barcode: '789200', category: 'Elétrica', unitOfMeasure: 'm', salePriceInCents: 550, stockQuantity: 20, isActive: true }
]
const register = { id: 1, status: 'open', openedAt: '2026-09-05T12:00:00Z', openingAmountInCents: 10000, closingAmountInCents: null, differenceInCents: null, notes: null }
let calls = 0
let lastInput = null
let failure = false
let refreshFailure = false
let sold = 0
let cash = 0
let opened = true
const ok = (data) => ({ success: true, data })
contextBridge.exposeInMainWorld('hardwareStore', {
  products: { list: async ({ query = '' } = {}) => {
    await new Promise((resolve) => setTimeout(resolve, query === 'Martelo' ? 400 : 10))
    const term = query.toLowerCase()
    return ok(products.filter((p) => [p.name, p.internalCode, p.barcode, p.category].some((v) => v.toLowerCase().includes(term))))
  } },
  customers: { list: async () => ok([{ id: 1, name: 'Maria Construções', document: '123', isActive: true }]) },
  cashRegisters: {
    getCurrentSummary: async () => refreshFailure ? { success: false, error: 'Falha ao atualizar caixa' } : ok(opened ? { cashRegister: register, totalSoldInCents: sold, cashPaymentsInCents: cash, expectedCashInCents: 10000 + cash } : null),
    listPrevious: async () => ok([])
  },
  sales: { finalize: async (input) => {
    calls++
    lastInput = input
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (failure) return { success: false, error: 'Estoque mudou. Revise os itens.' }
    const total = input.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceInCents) - item.discountInCents, 0) - input.discountInCents
    sold += total
    cash += input.payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amountInCents, 0)
    input.items.forEach((item) => { products.find((p) => p.id === item.productId).stockQuantity -= item.quantity })
    return ok({ id: calls, totalInCents: total })
  } }
})
contextBridge.exposeInMainWorld('salesTest', {
  calls: () => calls,
  lastInput: () => lastInput,
  fail: (value) => { failure = value },
  failRefresh: (value) => { refreshFailure = value },
  setOpen: (value) => { opened = value }
})
