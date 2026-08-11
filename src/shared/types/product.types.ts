import type { ProductUnit } from '../constants/product.constants'

export type Product = {
  id: number
  name: string
  internalCode: string
  barcode: string | null
  ncm: string | null
  category: string | null
  unitOfMeasure: ProductUnit
  costPriceInCents: number
  salePriceInCents: number
  stockQuantity: number
  minimumStockQuantity: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProductMutationInput = {
  name: string
  internalCode: string
  barcode?: string | null
  ncm?: string | null
  category?: string | null
  unitOfMeasure: ProductUnit
  costPriceInCents: number
  salePriceInCents: number
  stockQuantity: number
  minimumStockQuantity: number
  isActive?: boolean
}

export type ProductCreateInput = ProductMutationInput

export type ProductUpdateInput = Partial<ProductMutationInput>

export type ProductListFilters = {
  query?: string
  includeInactive?: boolean
}

export type ProductDuplicateCodeInput = {
  internalCode?: string
  barcode?: string | null
  ignoreProductId?: number
}

export type ProductDuplicateCodeResult = {
  internalCode: boolean
  barcode: boolean
}

export type ProductServiceResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      issues?: string[]
    }
