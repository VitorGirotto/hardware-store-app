import type { HardwareStoreApi } from '../../preload'

declare global {
  interface Window {
    hardwareStore: HardwareStoreApi
  }
}

export {}
