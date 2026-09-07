import electron from 'electron'
import { REPORTS_IPC_CHANNELS } from '../../shared/constants/reports.constants'
import * as reports from '../services/reports.service'

export const registerReportsIpc = (): void => {
  electron.ipcMain.handle(REPORTS_IPC_CHANNELS.lowStock, () => reports.lowStock())
  electron.ipcMain.handle(REPORTS_IPC_CHANNELS.cashRegisters, (_event, input) => reports.cashRegisters(input))
  electron.ipcMain.handle(REPORTS_IPC_CHANNELS.topProducts, (_event, input) => reports.topProducts(input))
  electron.ipcMain.handle(REPORTS_IPC_CHANNELS.sales, (_event, input) => reports.sales(input))
}
