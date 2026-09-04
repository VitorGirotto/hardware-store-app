import electron from 'electron'
import type { BrowserWindow as ElectronBrowserWindow } from 'electron'
import { join } from 'node:path'
import { initializeDatabase, getDatabasePath } from './db'
import { registerCustomerIpc } from './ipc/customer.ipc'
import { registerInventoryIpc } from './ipc/inventory.ipc'
import { registerProductIpc } from './ipc/product.ipc'

const { app, BrowserWindow, ipcMain } = electron

let mainWindow: ElectronBrowserWindow | null = null

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initializeDatabase()

  ipcMain.handle('app:get-database-path', () => getDatabasePath())
  registerCustomerIpc()
  registerInventoryIpc()
  registerProductIpc()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
