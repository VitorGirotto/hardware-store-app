import electron from 'electron'
import { CASH_REGISTER_IPC_CHANNELS } from '../../shared/constants/cash-register.constants'
import * as cashRegisterService from '../services/cash-register.service'

const { ipcMain } = electron

export const registerCashRegisterIpc = (): void => {
  ipcMain.handle(CASH_REGISTER_IPC_CHANNELS.open, (_event, input) =>
    cashRegisterService.openCashRegister(input)
  )

  ipcMain.handle(CASH_REGISTER_IPC_CHANNELS.close, (_event, input) =>
    cashRegisterService.closeCashRegister(input)
  )

  ipcMain.handle(CASH_REGISTER_IPC_CHANNELS.getOpen, () =>
    cashRegisterService.getOpenCashRegister()
  )

  ipcMain.handle(CASH_REGISTER_IPC_CHANNELS.listPrevious, () =>
    cashRegisterService.listPreviousCashRegisters()
  )

  ipcMain.handle(CASH_REGISTER_IPC_CHANNELS.getCurrentSummary, () =>
    cashRegisterService.getCurrentCashRegisterSummary()
  )
}
