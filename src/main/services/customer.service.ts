import type { z } from 'zod'
import {
  customerCreateSchema,
  customerDuplicateDocumentSchema,
  customerIdSchema,
  customerListFiltersSchema,
  customerUpdateSchema
} from '../../shared/schemas/customer.schema'
import type {
  Customer,
  CustomerCreateInput,
  CustomerDuplicateDocumentInput,
  CustomerDuplicateDocumentResult,
  CustomerListFilters,
  CustomerServiceResponse,
  CustomerUpdateInput
} from '../../shared/types/customer.types'
import * as customerRepository from '../repositories/customer.repository'

const success = <T>(data: T): CustomerServiceResponse<T> => ({
  success: true,
  data
})

const failure = <T = never>(
  error: string,
  issues?: string[]
): CustomerServiceResponse<T> => ({
  success: false,
  error,
  issues
})

const validationFailure = <T>(
  error: z.ZodError
): CustomerServiceResponse<T> => {
  const issues = error.issues.map((issue) => issue.message)
  return failure('Dados do cliente invalidos.', issues)
}

const parseId = (id: unknown): CustomerServiceResponse<number> => {
  const parsed = customerIdSchema.safeParse(id)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  return success(parsed.data)
}

const toBusinessError = (error: unknown, fallback: string): CustomerServiceResponse<never> => {
  if (error instanceof Error && error.message) {
    if (error.message.includes('customers.document')) {
      return failure('Documento ja cadastrado.')
    }

    return failure(error.message)
  }

  return failure(fallback)
}

export const validateCustomer = (
  input: unknown,
  mode: 'create' | 'update' = 'create'
): CustomerServiceResponse<CustomerCreateInput | CustomerUpdateInput> => {
  const parsed =
    mode === 'create'
      ? customerCreateSchema.safeParse(input)
      : customerUpdateSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  return success(parsed.data)
}

export const ensureUniqueDocument = (
  input: CustomerDuplicateDocumentInput
): CustomerServiceResponse<CustomerDuplicateDocumentResult> => {
  const duplicates = customerRepository.checkDuplicateDocument(input)

  if (duplicates.document) {
    return failure('Documento ja cadastrado.')
  }

  return success(duplicates)
}

export const createCustomer = (input: unknown): CustomerServiceResponse<Customer> => {
  const parsed = validateCustomer(input, 'create')

  if (!parsed.success) {
    return parsed
  }

  const customerInput = parsed.data as CustomerCreateInput
  const uniqueDocument = ensureUniqueDocument({
    document: customerInput.document
  })

  if (!uniqueDocument.success) {
    return uniqueDocument
  }

  try {
    return success(customerRepository.createCustomer(customerInput))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel criar o cliente.')
  }
}

export const listCustomers = (
  filters: unknown = {}
): CustomerServiceResponse<Customer[]> => {
  const parsed = customerListFiltersSchema.safeParse(filters ?? {})

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  const query = parsed.data.query?.trim()
  const normalizedFilters: CustomerListFilters = {
    includeInactive: parsed.data.includeInactive ?? false,
    query: query || undefined
  }

  try {
    return success(customerRepository.listCustomers(normalizedFilters))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel listar os clientes.')
  }
}

export const findCustomerById = (id: unknown): CustomerServiceResponse<Customer> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  try {
    const customer = customerRepository.findCustomerById(parsedId.data)

    if (!customer) {
      return failure('Cliente nao encontrado.')
    }

    return success(customer)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel buscar o cliente.')
  }
}

export const findCustomersByName = (
  name: unknown
): CustomerServiceResponse<Customer[]> => {
  if (typeof name !== 'string' || !name.trim()) {
    return failure('Informe um nome para buscar.')
  }

  try {
    return success(customerRepository.findCustomersByName(name.trim()))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel buscar clientes por nome.')
  }
}

export const updateCustomer = (
  id: unknown,
  input: unknown
): CustomerServiceResponse<Customer> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  const parsed = validateCustomer(input, 'update')

  if (!parsed.success) {
    return parsed
  }

  try {
    const currentCustomer = customerRepository.findCustomerById(parsedId.data)

    if (!currentCustomer) {
      return failure('Cliente nao encontrado.')
    }

    const customerInput = parsed.data as CustomerUpdateInput
    const uniqueDocument = ensureUniqueDocument({
      document: customerInput.document,
      ignoreCustomerId: parsedId.data
    })

    if (!uniqueDocument.success) {
      return uniqueDocument
    }

    const updatedCustomer = customerRepository.updateCustomer(
      parsedId.data,
      customerInput
    )

    if (!updatedCustomer) {
      return failure('Cliente nao encontrado.')
    }

    return success(updatedCustomer)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel atualizar o cliente.')
  }
}

export const inactivateCustomer = (id: unknown): CustomerServiceResponse<Customer> => {
  const parsedId = parseId(id)

  if (!parsedId.success) {
    return parsedId
  }

  try {
    const customer = customerRepository.inactivateCustomer(parsedId.data)

    if (!customer) {
      return failure('Cliente nao encontrado.')
    }

    return success(customer)
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel inativar o cliente.')
  }
}

export const checkDuplicateDocument = (
  input: unknown
): CustomerServiceResponse<CustomerDuplicateDocumentResult> => {
  const parsed = customerDuplicateDocumentSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(parsed.error)
  }

  try {
    return success(customerRepository.checkDuplicateDocument(parsed.data))
  } catch (error) {
    return toBusinessError(error, 'Nao foi possivel verificar o documento.')
  }
}
