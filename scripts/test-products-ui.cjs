if (process.env.ELECTRON_RUN_AS_NODE) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  process.exit(require('node:child_process').spawnSync(process.execPath, [__filename], { env, stdio: 'inherit' }).status ?? 1)
}
// Run after npm run build: node_modules/electron/dist/electron scripts/test-products-ui.cjs
const { app, BrowserWindow } = require('electron')
const { join } = require('node:path')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const assert = require('node:assert/strict')
const profile = mkdtempSync(join(tmpdir(), 'hardware-products-ui-'))
app.setPath('userData', profile)
app.disableHardwareAcceleration()
let window
const errors = []
const evaluate = async (code) => {
  try { return await window.webContents.executeJavaScript(code) }
  catch (error) { throw new Error(`Renderer evaluation failed: ${code}`, { cause: error }) }
}
const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms))
const click = async (text) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); return !!b && !b.disabled })()`)
    if (ready) break
    await delay(50)
  }
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b || b.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); b.click() })()`)
  await delay()
}
const setInput = async (selector, value) => {
  await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Missing input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await delay()
}
const body = () => evaluate('document.body.innerText')
app.whenReady().then(async () => {
  window = new BrowserWindow({ width: 1200, height: 1200, show: false, webPreferences: { preload: join(__dirname, 'products-ui-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, backgroundThrottling: false, offscreen: true } })
  window.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message) })
  await window.loadFile(join(__dirname, '../out/renderer/index.html'))
  await click('Produtos')
  await click('Novo produto')
  assert.equal(await evaluate("document.querySelector('aside button[type=submit]').disabled"), true)
  await delay(350)
  assert.equal(await evaluate("document.querySelector('aside form input[readonly]').value"), '8')
  await click('Cancelar')
  await click('Novo produto')
  await delay(350)
  assert.equal(await evaluate("document.querySelector('aside form input[readonly]').value"), '8')
  await setInput('aside form input', 'Produto automatico')
  await click('Salvar')
  assert.equal(await evaluate("Object.hasOwn(window.productsTest.lastInput(), 'internalCode')"), false)
  await click('Novo produto')
  await delay(350)
  assert.equal(await evaluate("document.querySelector('aside form input[readonly]').value"), '9')
  await click('Cancelar')
  await evaluate('window.productsTest.fail(true)')
  await click('Novo produto')
  await delay(350)
  assert.match(await body(), /Falha ao consultar codigo/)
  assert.equal(await evaluate("document.querySelector('aside button[type=submit]').disabled"), true)
  await evaluate('window.productsTest.fail(false)')
  await click('Tentar obter codigo novamente')
  await delay(350)
  assert.equal(await evaluate("document.querySelector('aside form input[readonly]').value"), '9')
  assert.equal(await evaluate("document.querySelector('aside button[type=submit]').disabled"), false)
  await click('Cancelar')
  await click('Editar')
  assert.equal(await evaluate("document.querySelector('aside form input[readonly]') === null"), true)
  assert.equal(await evaluate("document.querySelectorAll('aside form input')[1].value"), '8')
  assert.deepEqual(errors, [])
  console.log('Products UI passed: loading, automatic code, cancel/reopen, creation payload, next code, failure/retry and editing.')
}).catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => {
  if (window) window.destroy()
  app.exit(process.exitCode || 0)
})
app.on('will-quit', () => { try { rmSync(profile, { recursive: true, force: true }) } catch {} })
