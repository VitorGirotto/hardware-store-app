import electron from 'electron'
import { PRODUCT_IPC_CHANNELS } from '../shared/constants/product.constants'
import type {
  Product,
  ProductCreateInput,
  ProductDuplicateCodeInput,
  ProductDuplicateCodeResult,
  ProductListFilters,
  ProductServiceResponse,
  ProductUpdateInput
} from '../shared/types/product.types'

const { contextBridge, ipcRenderer } = electron

const api = {
  getDatabasePath: (): Promise<string> => ipcRenderer.invoke('app:get-database-path'),
  products: {
    create: (
      input: ProductCreateInput
    ): Promise<ProductServiceResponse<Product>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.create, input),
    list: (
      filters?: ProductListFilters
    ): Promise<ProductServiceResponse<Product[]>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.list, filters),
    getById: (id: number): Promise<ProductServiceResponse<Product>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.getById, id),
    searchByName: (name: string): Promise<ProductServiceResponse<Product[]>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.searchByName, name),
    update: (
      id: number,
      input: ProductUpdateInput
    ): Promise<ProductServiceResponse<Product>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.update, id, input),
    inactivate: (id: number): Promise<ProductServiceResponse<Product>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.inactivate, id),
    checkDuplicateCodes: (
      input: ProductDuplicateCodeInput
    ): Promise<ProductServiceResponse<ProductDuplicateCodeResult>> =>
      ipcRenderer.invoke(PRODUCT_IPC_CHANNELS.checkDuplicateCodes, input)
  },
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

contextBridge.exposeInMainWorld('hardwareStore', api)

export type HardwareStoreApi = typeof api
