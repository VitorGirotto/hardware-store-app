// Uses the compiled application preload and real IPC; SQL behavior has integration tests.
if (process.env.ELECTRON_RUN_AS_NODE) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  process.exit(require('node:child_process').spawnSync(process.execPath, [__filename], { env, stdio: 'inherit' }).status ?? 1)
}
const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('node:path')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const assert = require('node:assert/strict')
const profile = mkdtempSync(join(tmpdir(), 'hardware-reports-ui-'))
app.setPath('userData', profile)
app.disableHardwareAcceleration()
let window
const errors = [], calls = []
let mode = 'normal'
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ok = (data) => ({ success: true, data })
const saleData = (total = 10000, count = 1) => ({ saleCount: count, totalSoldInCents: total, averageTicketInCents: count ? total / count : 0, totalsByPaymentMethod: [
  { method: 'cash', totalInCents: total * 0.6 }, { method: 'pix', totalInCents: total * 0.4 }, { method: 'debit_card', totalInCents: 0 }, { method: 'credit_card', totalInCents: 0 }
] })
const fixtures = {
  sales: saleData(),
  'top-products': [{ productId: 1, productName: 'Martelo histórico', quantitySold: 0.5, totalSoldInCents: 9999 }],
  'low-stock': [{ productId: 1, productName: 'Cabo flexível', unitOfMeasure: 'm', stockQuantity: 0.25, minimumStockQuantity: 1.5, missingQuantity: 1.25 }],
  'cash-registers': [{ id: 1, openedAt: '2026-09-05 12:00:00', closedAt: '2026-09-05T15:00:00Z', openingAmountInCents: 1000, totalSoldInCents: 10000, expectedCashInCents: 7000, closingAmountInCents: 6900, differenceInCents: -100 }, { id: 2, openedAt: '2026-09-06 12:00:00', closedAt: null, openingAmountInCents: 0, totalSoldInCents: 0, expectedCashInCents: 0, closingAmountInCents: null, differenceInCents: null }]
}
ipcMain.handle('backups:get-status', () => ok({ destinationDirectory: null, reminderDays: 7, lastBackupAt: null, lastBackupPath: null, isOverdue: true, isRunning: false }))
ipcMain.handle('cash-register:get-current-summary', () => ok(null))
for (const type of Object.keys(fixtures)) ipcMain.handle(`reports:${type}`, async (_event, filters) => {
  calls.push({ type, filters })
  const currentMode = mode
  await delay(currentMode === 'slow' ? 450 : 20)
  if (currentMode === 'failure') return { success: false, error: 'Falha simulada. Tente novamente.' }
  if (currentMode === 'empty') return ok(type === 'sales' ? saleData(0, 0) : [])
  return ok(currentMode === 'slow' && type === 'sales' ? saleData(999900) : fixtures[type])
})
const evaluate = (code) => window.webContents.executeJavaScript(code)
const visible = '[role="tabpanel"]:not([hidden])'
const panelText = () => evaluate(`document.querySelector('${visible}').innerText`)
const waitFor = async (predicate, message) => {
  for (let attempt = 0; attempt < 100; attempt++) { if (await predicate()) return; await delay(30) }
  throw new Error(`Timed out: ${message}`)
}
const click = async (selector) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await delay(40) }
const input = async (label, value) => {
  await evaluate(`(() => { const el = document.querySelector('${visible} [aria-label="${label}"]'); Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
  await delay(30)
}
const generate = () => click(`${visible} button[type="submit"]`)
const loaded = () => waitFor(async () => (await panelText()).includes('Filtros aplicados:'), 'report results')
app.whenReady().then(async () => {
  window = new BrowserWindow({ width: 1200, height: 900, show: false, webPreferences: { preload: join(__dirname, '../out/preload/index.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, backgroundThrottling: false, offscreen: true } })
  window.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message) })
  await window.loadFile(join(__dirname, '../out/renderer/index.html'))
  await evaluate("[...document.querySelectorAll('nav button')].find(b => b.textContent === 'Relatórios').click()")
  await loaded()
  assert.ok(calls.every((call) => call.type === 'sales'), 'Only active report loads')
  const expected = await evaluate("(() => { const d = new Date(); const pad = n => String(n).padStart(2, '0'); const prefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-`; return { startDate: prefix + '01', endDate: prefix + pad(d.getDate()) } })()")
  assert.deepEqual(calls.at(-1).filters, expected)
  assert.match(await panelText(), /Quantidade de vendas/)
  assert.match(await panelText(), /100,00/)
  await input('Data inicial', '2026-09-01'); await input('Data final', '2026-09-10'); await input('Forma de pagamento', 'pix')
  await generate(); await loaded()
  assert.deepEqual(calls.at(-1).filters, { startDate: '2026-09-01', endDate: '2026-09-10', paymentMethod: 'pix' })
  assert.match(await panelText(), /01\/09\/2026 a 10\/09\/2026 • Pix/)
  assert.match(await panelText(), /60,00/)
  await input('Data inicial', '2026-10-01')
  const beforeInvalid = calls.length
  await generate()
  assert.match(await panelText(), /data final deve ser igual ou posterior/)
  assert.equal(calls.length, beforeInvalid)
  await input('Data inicial', '2026-09-01')
  mode = 'failure'; await generate()
  await waitFor(async () => (await panelText()).includes('Falha simulada'), 'error message')
  mode = 'normal'; await generate(); await loaded()
  mode = 'slow'; await generate()
  assert.match(await panelText(), /Carregando/)
  mode = 'normal'; await input('Forma de pagamento', 'cash'); await generate(); await loaded()
  await delay(500)
  assert.doesNotMatch(await panelText(), /9\.999,00/)
  assert.match(await panelText(), /• Dinheiro/)
  mode = 'empty'; await generate(); await loaded()
  assert.match(await panelText(), /Nenhuma venda encontrada/)
  mode = 'normal'
  await click('#tab-topProducts'); await loaded()
  assert.match(await panelText(), /Martelo histórico/)
  assert.match(await panelText(), /0,5/)
  assert.equal(calls.at(-1).filters.paymentMethod, undefined)
  await click('#tab-lowStock'); await loaded()
  assert.match(await panelText(), /Cabo flexível/)
  assert.match(await panelText(), /1,25 m/)
  assert.equal(await evaluate(`document.querySelectorAll('${visible} input').length`), 0)
  assert.equal(calls.at(-1).filters, undefined)
  await click('#tab-cashRegisters'); await loaded()
  assert.match(await panelText(), /70,00/)
  assert.match(await panelText(), /-.*1,00/)
  const localTimestamp = await evaluate("new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date('2026-09-05T12:00:00Z'))")
  assert.ok((await panelText()).includes(localTimestamp))
  assert.equal(await evaluate(`document.querySelector('${visible} tbody tr:last-child').innerText.split('—').length - 1`), 3)
  for (const [tab, text] of [['cashRegisters', 'Nenhum caixa'], ['topProducts', 'Nenhum produto vendido'], ['lowStock', 'Nenhum produto com estoque baixo']]) {
    mode = 'empty'; await click(`#tab-${tab}`); await generate(); await loaded(); assert.ok((await panelText()).includes(text))
  }
  mode = 'normal'; await click('#tab-sales'); await loaded()
  assert.equal(await evaluate(`document.querySelector('${visible} input[aria-label="Data final"]').value`), '2026-09-10')
  assert.equal(await evaluate(`document.querySelector('${visible} select').value`), 'cash')
  await evaluate("document.getElementById('tab-sales').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))")
  await loaded()
  assert.equal(await evaluate('document.activeElement.id'), 'tab-topProducts')
  window.setSize(900, 700)
  await click('#tab-cashRegisters'); await loaded()
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Tables scroll inside the panel')
  writeFileSync(join(tmpdir(), 'hardware-reports.png'), (await window.webContents.capturePage()).toPNG())
  assert.deepEqual(errors, [])
  console.log('Reports UI passed: real preload/IPC, tabs, periods, payment filters, validation, empty states, errors, stale responses, keyboard and narrow layout. Screenshot: /tmp/hardware-reports.png')
}).catch((error) => { console.error(error); console.error(errors); process.exitCode = 1 }).finally(() => {
  if (window) window.destroy()
  app.exit(process.exitCode || 0)
})
app.on('will-quit', () => { try { rmSync(profile, { recursive: true, force: true }) } catch {} })
