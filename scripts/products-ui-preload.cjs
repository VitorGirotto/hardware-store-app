const { contextBridge } = require('electron')
const ok = (data) => ({ success: true, data })
let nextCode = 8
let fail = false
let lastInput
const products = []
contextBridge.exposeInMainWorld('hardwareStore', {
  products: {
    list: async () => ok(products),
    getNextInternalCode: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
      return fail ? { success: false, error: 'Falha ao consultar codigo' } : ok(String(nextCode))
    },
    create: async (input) => {
      lastInput = input
      const product = { ...input, id: nextCode, internalCode: String(nextCode++), createdAt: '', updatedAt: '' }
      products.push(product)
      return ok(product)
    },
    update: async (id, input) => {
      const product = products.find((item) => item.id === id)
      Object.assign(product, input)
      return ok(product)
    }
  }
})
contextBridge.exposeInMainWorld('productsTest', {
  fail: (value) => { fail = value },
  lastInput: () => lastInput
})
