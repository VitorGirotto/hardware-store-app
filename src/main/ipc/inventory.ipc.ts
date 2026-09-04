import electron from 'electron'
import { INVENTORY_IPC_CHANNELS } from '../../shared/constants/inventory.constants'
import * as inventoryService from '../services/inventory.service'

const { ipcMain } = electron

export const registerInventoryIpc = (): void => {
  ipcMain.handle(INVENTORY_IPC_CHANNELS.registerEntry, (_event, input) =>
    inventoryService.registerEntry(input)
  )

  ipcMain.handle(INVENTORY_IPC_CHANNELS.registerExit, (_event, input) =>
    inventoryService.registerExit(input)
  )

  ipcMain.handle(INVENTORY_IPC_CHANNELS.registerAdjustment, (_event, input) =>
    inventoryService.registerAdjustment(input)
  )

  ipcMain.handle(INVENTORY_IPC_CHANNELS.listHistory, (_event, filters) =>
    inventoryService.listHistory(filters)
  )

  ipcMain.handle(INVENTORY_IPC_CHANNELS.listCurrentStock, () =>
    inventoryService.listCurrentStock()
  )

  ipcMain.handle(INVENTORY_IPC_CHANNELS.listLowStock, () =>
    inventoryService.listLowStock()
  )
}
