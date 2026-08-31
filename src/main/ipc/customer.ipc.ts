import electron from 'electron'
import { CUSTOMER_IPC_CHANNELS } from '../../shared/constants/customer.constants'
import * as customerService from '../services/customer.service'

const { ipcMain } = electron

export const registerCustomerIpc = (): void => {
  ipcMain.handle(CUSTOMER_IPC_CHANNELS.create, (_event, input) =>
    customerService.createCustomer(input)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.list, (_event, filters) =>
    customerService.listCustomers(filters)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.getById, (_event, id) =>
    customerService.findCustomerById(id)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.searchByName, (_event, name) =>
    customerService.findCustomersByName(name)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.update, (_event, id, input) =>
    customerService.updateCustomer(id, input)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.inactivate, (_event, id) =>
    customerService.inactivateCustomer(id)
  )

  ipcMain.handle(CUSTOMER_IPC_CHANNELS.checkDuplicateDocument, (_event, input) =>
    customerService.checkDuplicateDocument(input)
  )
}
