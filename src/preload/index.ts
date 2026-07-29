import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getDatabasePath: (): Promise<string> => ipcRenderer.invoke('app:get-database-path'),
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

contextBridge.exposeInMainWorld('hardwareStore', api)

export type HardwareStoreApi = typeof api
