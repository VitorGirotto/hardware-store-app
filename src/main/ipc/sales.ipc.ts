import electron from 'electron'
import { SALES_IPC_CHANNELS } from '../../shared/constants/sales.constants'
import { finalizeSale } from '../services/sales.service'

export const registerSalesIpc = (): void => {
  electron.ipcMain.handle(SALES_IPC_CHANNELS.finalize, (_event, input) => finalizeSale(input))
}
