import type { z } from 'zod'
import {
  productCreateSchema,
  productDuplicateCodeSchema,
  productIdSchema,
  productListFiltersSchema,
  productUpdateSchema
} from '../../shared/schemas/product.schema'
import type {
  Product,
  ProductCreateInput,
  ProductDuplicateCodeInput,
  ProductDuplicateCodeResult,
  ProductListFilters,
  ProductServiceResponse,
  ProductUpdateInput
} from '../../shared/types/product.types'
import * as productRepository from '../repositories/product.repository'

const success = <T>(data: T): ProductServiceResponse<T> => ({
  success: true,
  data
})

const failure = <T = never>(
  error: string,
  issues?: string[]
): ProductServiceResponse<T> => ({
  success: false,
  error,
  issues
})

const validationFailure = <T>(
  error: z.ZodError
): ProductServiceResponse<T> => {
  const issues = error.issues.map((issue) => issue.message)
  return failure('Dados do produto invalidos.', issues)
}

const parseId = (id: unknown): ProductServiceResponse<number> => {
  const parsed = productIdSchema.safeParse(id)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  return success(parsed.data)
}

const toBusinessError = (error: unknown, fallback: string): ProductServiceResponse<never> => {
  if (error instanceof Error && error.message) {
    if (error.message.includes('products.internal_code')) {
      return failure('Codigo interno ja cadastrado.')
    }

    if (error.message.includes('products.barcode')) {
      return failure('Codigo de barras ja cadastrado.')
    }

    return failure(error.message)
  }

  return failure(fallback)
}

const ensureUniqueCodes = (
  input: ProductDuplicateCodeInput
): ProductServiceResponse<ProductDuplicateCodeResult> => {
  const duplicates = productRepository.checkDuplicateCodes(input)

  if (duplicates.internalCode) {
    return failure('Codigo interno ja cadastrado.')
  }

  if (duplicates.barcode) {
    return failure('Codigo de barras ja cadastrado.')
  }

  return success(duplicates)
}

export const createProduct = (input: unknown): ProductServiceResponse<Product> => {
  const parsed = productCreateSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  const uniqueCodes = ensureUniqueCodes({
    internalCode: parsed.data.internalCode,
    barcode: parsed.data.barcode
  })

  if (!uniqueCodes.success) {
    return uniqueCodes
  }

  try {
    return success(productRepository.createProduct(parsed.data as ProductCreateInput))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel criar o produto.')
  }
}

export const listProducts = (
  filters: unknown = {}
): ProductServiceResponse<Product[]> => {
  const parsed = productListFiltersSchema.safeParse(filters ?? {})

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  const query = parsed.data.query?.trim()
  const normalizedFilters: ProductListFilters = {
    includeInactive: parsed.data.includeInactive ?? false,
    query: query || undefined
  }

  try {
    return success(productRepository.listProducts(normalizedFilters))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel listar os produtos.')
  }
}

export const findProductById = (id: unknown): ProductServiceResponse<Product> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  try {
    const product = productRepository.findProductById(parsedId.data)

    if (!product) {
      return failure('Produto nao encontrado.')
    }

    return success(product)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel buscar o produto.')
  }
}

export const findProductsByName = (
  name: unknown
): ProductServiceResponse<Product[]> => {
  if (typeof name !== 'string' || !name.trim()) {
    return failure('Informe um nome para buscar.')
  }

  try {
    return success(productRepository.findProductsByName(name.trim()))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel buscar produtos por nome.')
  }
}

export const updateProduct = (
  id: unknown,
  input: unknown
): ProductServiceResponse<Product> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  const parsed = productUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    const currentProduct = productRepository.findProductById(parsedId.data)

    if (!currentProduct) {
      return failure('Produto nao encontrado.')
    }

    const uniqueCodes = ensureUniqueCodes({
      internalCode: parsed.data.internalCode,
      barcode: parsed.data.barcode,
      ignoreProductId: parsedId.data
    })

    if (!uniqueCodes.success) {
      return uniqueCodes
    }

    const updatedProduct = productRepository.updateProduct(
      parsedId.data,
      parsed.data as ProductUpdateInput
    )

    if (!updatedProduct) {
      return failure('Produto nao encontrado.')
    }

    return success(updatedProduct)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel atualizar o produto.')
  }
}

export const inactivateProduct = (id: unknown): ProductServiceResponse<Product> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  try {
    const product = productRepository.inactivateProduct(parsedId.data)

    if (!product) {
      return failure('Produto nao encontrado.')
    }

    return success(product)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel inativar o produto.')
  }
}

export const checkDuplicateCodes = (
  input: unknown
): ProductServiceResponse<ProductDuplicateCodeResult> => {
  const parsed = productDuplicateCodeSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    return success(productRepository.checkDuplicateCodes(parsed.data))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel verificar os codigos.')
  }
}
