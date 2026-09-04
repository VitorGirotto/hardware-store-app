import electron from 'electron'
import { CUSTOMER_IPC_CHANNELS } from '../shared/constants/customer.constants'
import { INVENTORY_IPC_CHANNELS } from '../shared/constants/inventory.constants'
import { PRODUCT_IPC_CHANNELS } from '../shared/constants/product.constants'
import type {
  Customer,
  CustomerCreateInput,
  CustomerDuplicateDocumentInput,
  CustomerDuplicateDocumentResult,
  CustomerListFilters,
  CustomerServiceResponse,
  CustomerUpdateInput
} from '../shared/types/customer.types'
import type {
  InventoryProduct,
  InventoryServiceResponse,
  StockAdjustmentInput,
  StockEntryInput,
  StockExitInput,
  StockHistoryFilters,
  StockMovement
} from '../shared/types/inventory.types'
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
  customers: {
    create: (
      input: CustomerCreateInput
    ): Promise<CustomerServiceResponse<Customer>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.create, input),
    list: (
      filters?: CustomerListFilters
    ): Promise<CustomerServiceResponse<Customer[]>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.list, filters),
    getById: (id: number): Promise<CustomerServiceResponse<Customer>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.getById, id),
    searchByName: (name: string): Promise<CustomerServiceResponse<Customer[]>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.searchByName, name),
    update: (
      id: number,
      input: CustomerUpdateInput
    ): Promise<CustomerServiceResponse<Customer>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.update, id, input),
    inactivate: (id: number): Promise<CustomerServiceResponse<Customer>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.inactivate, id),
    checkDuplicateDocument: (
      input: CustomerDuplicateDocumentInput
    ): Promise<CustomerServiceResponse<CustomerDuplicateDocumentResult>> =>
      ipcRenderer.invoke(CUSTOMER_IPC_CHANNELS.checkDuplicateDocument, input)
  },
  inventory: {
    registerEntry: (
      input: StockEntryInput
    ): Promise<InventoryServiceResponse<StockMovement>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.registerEntry, input),
    registerExit: (
      input: StockExitInput
    ): Promise<InventoryServiceResponse<StockMovement>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.registerExit, input),
    registerAdjustment: (
      input: StockAdjustmentInput
    ): Promise<InventoryServiceResponse<StockMovement>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.registerAdjustment, input),
    listHistory: (
      filters?: StockHistoryFilters
    ): Promise<InventoryServiceResponse<StockMovement[]>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.listHistory, filters),
    listCurrentStock: (): Promise<InventoryServiceResponse<InventoryProduct[]>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.listCurrentStock),
    listLowStock: (): Promise<InventoryServiceResponse<InventoryProduct[]>> =>
      ipcRenderer.invoke(INVENTORY_IPC_CHANNELS.listLowStock)
  },
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
