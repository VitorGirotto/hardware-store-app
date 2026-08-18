import type {
  Product,
  ProductCreateInput,
  ProductDuplicateCodeInput,
  ProductDuplicateCodeResult,
  ProductListFilters,
  ProductServiceResponse,
  ProductUpdateInput
} from '../../../../shared/types/product.types'

const getProductsApi = (): Window['hardwareStore']['products'] => {
  if (!window.hardwareStore?.products) {
    throw new Error('API de produtos indisponivel.')
  }

  return window.hardwareStore.products
}

export const productApi = {
  create: (
    input: ProductCreateInput
  ): Promise<ProductServiceResponse<Product>> =>
    getProductsApi().create(input),
  list: (
    filters?: ProductListFilters
  ): Promise<ProductServiceResponse<Product[]>> =>
    getProductsApi().list(filters),
  getById: (id: number): Promise<ProductServiceResponse<Product>> =>
    getProductsApi().getById(id),
  searchByName: (name: string): Promise<ProductServiceResponse<Product[]>> =>
    getProductsApi().searchByName(name),
  update: (
    id: number,
    input: ProductUpdateInput
  ): Promise<ProductServiceResponse<Product>> =>
    getProductsApi().update(id, input),
  inactivate: (id: number): Promise<ProductServiceResponse<Product>> =>
    getProductsApi().inactivate(id),
  checkDuplicateCodes: (
    input: ProductDuplicateCodeInput
  ): Promise<ProductServiceResponse<ProductDuplicateCodeResult>> =>
    getProductsApi().checkDuplicateCodes(input)
}
