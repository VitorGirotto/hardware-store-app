import { ipcMain } from 'electron'
import { PRODUCT_IPC_CHANNELS } from '../../shared/constants/product.constants'
import * as productService from '../services/product.service'

export const registerProductIpc = (): void => {
  ipcMain.handle(PRODUCT_IPC_CHANNELS.create, (_event, input) =>
    productService.createProduct(input)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.list, (_event, filters) =>
    productService.listProducts(filters)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.getById, (_event, id) =>
    productService.findProductById(id)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.searchByName, (_event, name) =>
    productService.findProductsByName(name)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.update, (_event, id, input) =>
    productService.updateProduct(id, input)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.inactivate, (_event, id) =>
    productService.inactivateProduct(id)
  )

  ipcMain.handle(PRODUCT_IPC_CHANNELS.checkDuplicateCodes, (_event, input) =>
    productService.checkDuplicateCodes(input)
  )
}
