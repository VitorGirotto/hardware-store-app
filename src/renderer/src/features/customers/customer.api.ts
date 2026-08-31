import type {
  Customer,
  CustomerCreateInput,
  CustomerDuplicateDocumentInput,
  CustomerDuplicateDocumentResult,
  CustomerListFilters,
  CustomerServiceResponse,
  CustomerUpdateInput
} from '../../../../shared/types/customer.types'

const getCustomersApi = (): Window['hardwareStore']['customers'] => {
  if (!window.hardwareStore?.customers) {
    throw new Error('API de clientes indisponivel.')
  }

  return window.hardwareStore.customers
}

export const customerApi = {
  create: (
    input: CustomerCreateInput
  ): Promise<CustomerServiceResponse<Customer>> =>
    getCustomersApi().create(input),
  list: (
    filters?: CustomerListFilters
  ): Promise<CustomerServiceResponse<Customer[]>> =>
    getCustomersApi().list(filters),
  getById: (id: number): Promise<CustomerServiceResponse<Customer>> =>
    getCustomersApi().getById(id),
  searchByName: (name: string): Promise<CustomerServiceResponse<Customer[]>> =>
    getCustomersApi().searchByName(name),
  update: (
    id: number,
    input: CustomerUpdateInput
  ): Promise<CustomerServiceResponse<Customer>> =>
    getCustomersApi().update(id, input),
  inactivate: (id: number): Promise<CustomerServiceResponse<Customer>> =>
    getCustomersApi().inactivate(id),
  checkDuplicateDocument: (
    input: CustomerDuplicateDocumentInput
  ): Promise<CustomerServiceResponse<CustomerDuplicateDocumentResult>> =>
    getCustomersApi().checkDuplicateDocument(input)
}
