import type {
  Product,
  ProductCreateInput,
  ProductDuplicateCodeInput,
  ProductDuplicateCodeResult,
  ProductListFilters,
  ProductServiceResponse,
  ProductUpdateInput
} from '../../../../shared/types/product.types'

export const productApi = {
  create: (
    input: ProductCreateInput
  ): Promise<ProductServiceResponse<Product>> =>
    window.hardwareStore.products.create(input),
  list: (
    filters?: ProductListFilters
  ): Promise<ProductServiceResponse<Product[]>> =>
    window.hardwareStore.products.list(filters),
  getById: (id: number): Promise<ProductServiceResponse<Product>> =>
    window.hardwareStore.products.getById(id),
  searchByName: (name: string): Promise<ProductServiceResponse<Product[]>> =>
    window.hardwareStore.products.searchByName(name),
  update: (
    id: number,
    input: ProductUpdateInput
  ): Promise<ProductServiceResponse<Product>> =>
    window.hardwareStore.products.update(id, input),
  inactivate: (id: number): Promise<ProductServiceResponse<Product>> =>
    window.hardwareStore.products.inactivate(id),
  checkDuplicateCodes: (
    input: ProductDuplicateCodeInput
  ): Promise<ProductServiceResponse<ProductDuplicateCodeResult>> =>
    window.hardwareStore.products.checkDuplicateCodes(input)
}
