// Exercises the compiled renderer, preload and IPC with controlled backup responses.
if (process.env.ELECTRON_RUN_AS_NODE) {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  process.exit(require('node:child_process').spawnSync(process.execPath, [__filename], { env, stdio: 'inherit' }).status ?? 1)
}
const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('node:path')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const assert = require('node:assert/strict')
const profile = mkdtempSync(join(tmpdir(), 'hardware-backups-ui-'))
app.setPath('userData', profile)
app.disableHardwareAcceleration()
let window, fail = false, cancel = false, statusFailure = false, statusCalls = 0
let state = { destinationDirectory: null, reminderDays: 7, lastBackupAt: null, lastBackupPath: null, isOverdue: true, isRunning: false }
const ok = () => ({ success: true, data: { ...state } })
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
ipcMain.handle('cash-register:get-current-summary', () => ({ success: true, data: null }))
ipcMain.handle('backups:get-status', () => { statusCalls++; return statusFailure ? { success: false, error: 'Falha ao consultar backup.' } : ok() })
ipcMain.handle('backups:choose-directory', () => { if (!cancel) state.destinationDirectory = '/tmp/backups'; return ok() })
ipcMain.handle('backups:update-reminder-days', (_event, days) => { state.reminderDays = days; return ok() })
ipcMain.handle('backups:create', async () => {
  state.isRunning = true
  await delay(400)
  state.isRunning = false
  if (fail) return { success: false, error: 'Pasta indisponível para backup.' }
  state.lastBackupAt = new Date().toISOString()
  state.lastBackupPath = '/tmp/backups/backup-2026-09-08-14-30.db'
  state.isOverdue = false
  return ok()
})
const evaluate = code => window.webContents.executeJavaScript(code)
const text = () => evaluate('document.querySelector("main").innerText')
const waitFor = async (predicate) => {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await delay(30) }
  throw new Error('Timed out waiting for UI')
}
const click = async label => { await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)}).click()`); await delay(30) }
app.whenReady().then(async () => {
  window = new BrowserWindow({ show: false, width: 900, height: 700, webPreferences: { preload: join(__dirname, '../out/preload/index.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, offscreen: true, backgroundThrottling: false } })
  await window.loadFile(join(__dirname, '../out/renderer/index.html'))
  await waitFor(async () => (await text()).includes('Gere seu primeiro backup'))
  await click('Abrir backups')
  await waitFor(async () => (await text()).includes('Nenhuma pasta selecionada'))
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Gerar backup').disabled"), true)
  cancel = true; await click('Escolher pasta')
  assert.match(await text(), /Nenhuma pasta selecionada/)
  cancel = false; await click('Escolher pasta')
  assert.match(await text(), /\/tmp\/backups/)
  await evaluate(`(() => { const el = document.getElementById('backup-days'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '3'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await click('Salvar prazo')
  assert.equal(state.reminderDays, 3)
  await click('Gerar backup')
  assert.equal(await evaluate("document.getElementById('backup-days').disabled"), true)
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Escolher pasta').disabled"), true)
  await waitFor(async () => (await text()).includes('Backup criado em'))
  await click('Dashboard')
  await waitFor(async () => (await text()).includes('Situação do caixa'))
  assert.doesNotMatch(await text(), /Gere seu primeiro backup|Abrir backups/)
  state.isOverdue = true
  const previousCalls = statusCalls
  await evaluate("window.dispatchEvent(new Event('focus'))")
  await waitFor(async () => (await text()).includes('há mais de 3 dias'))
  assert.ok(statusCalls > previousCalls)
  statusFailure = true; await click('Atualizar')
  await waitFor(async () => (await text()).includes('Falha ao consultar backup.'))
  assert.match(await text(), /Caixa fechado/)
  statusFailure = false
  await click('Abrir backups')
  await waitFor(async () => (await text()).includes('Último backup concluído'))
  fail = true; await click('Gerar backup')
  await waitFor(async () => (await text()).includes('Pasta indisponível'))
  assert.match(await text(), /backup-2026-09-08/)
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
  console.log('Backups UI passed: navigation, picker cancellation, configuration, busy state, success, overdue warning, focus refresh and independent errors.')
}).catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  if (window) window.destroy()
  app.exit(process.exitCode || 0)
})
app.on('will-quit', () => rmSync(profile, { recursive: true, force: true }))
