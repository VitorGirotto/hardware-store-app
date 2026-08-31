export type Customer = {
  id: number
  name: string
  document: string | null
  phone: string | null
  address: string | null
  creditLimitInCents: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CustomerMutationInput = {
  name: string
  document?: string | null
  phone?: string | null
  address?: string | null
  creditLimitInCents: number
  isActive?: boolean
}

export type CustomerCreateInput = CustomerMutationInput

export type CustomerUpdateInput = Partial<CustomerMutationInput>

export type CustomerListFilters = {
  query?: string
  includeInactive?: boolean
}

export type CustomerDuplicateDocumentInput = {
  document?: string | null
  ignoreCustomerId?: number
}

export type CustomerDuplicateDocumentResult = {
  document: boolean
}

export type CustomerServiceResponse<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
      issues?: string[]
    }
