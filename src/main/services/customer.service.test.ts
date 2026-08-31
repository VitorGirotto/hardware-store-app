import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Customer,
  CustomerCreateInput,
  CustomerServiceResponse
} from '../../shared/types/customer.types'
import { getDatabase } from '../db'
import { customers, payments, saleItems, sales } from '../db/schema'
import {
  createCustomer,
  findCustomerById,
  findCustomersByName,
  inactivateCustomer,
  listCustomers,
  updateCustomer
} from './customer.service'

vi.mock('electron', () => ({
  default: {
    app: {
      isPackaged: false,
      getPath: () => '/tmp'
    }
  },
  app: {
    isPackaged: false,
    getPath: () => '/tmp'
  }
}))

let sequence = 0

const buildCustomerInput = (
  overrides: Partial<CustomerCreateInput> = {}
): CustomerCreateInput => {
  sequence += 1

  return {
    name: `Cliente ${sequence}`,
    document: null,
    phone: '(11) 99999-0000',
    address: 'Rua das Ferramentas, 100',
    creditLimitInCents: 10000,
    isActive: true,
    ...overrides
  }
}

const expectSuccess = <T>(result: CustomerServiceResponse<T>): T => {
  expect(result.success).toBe(true)

  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data
}

const expectFailure = <T>(result: CustomerServiceResponse<T>): string => {
  expect(result.success).toBe(false)

  if (result.success) {
    throw new Error('Expected failure response.')
  }

  return result.error
}

describe('customer service', () => {
  beforeEach(() => {
    const db = getDatabase()
    db.delete(payments).run()
    db.delete(saleItems).run()
    db.delete(sales).run()
    db.delete(customers).run()
  })

  it('creates and finds a customer by id', () => {
    const created = expectSuccess(createCustomer(buildCustomerInput()))
    const found = expectSuccess(findCustomerById(created.id))

    expect(found.id).toBe(created.id)
    expect(found.name).toBe(created.name)
  })

  it('lists only active customers by default', () => {
    const active = expectSuccess(createCustomer(buildCustomerInput({ name: 'Ativo' })))
    const inactive = expectSuccess(createCustomer(buildCustomerInput({ name: 'Inativo' })))

    expectSuccess(inactivateCustomer(inactive.id))

    const listed = expectSuccess(listCustomers())
    const ids = listed.map((customer: Customer) => customer.id)

    expect(ids).toContain(active.id)
    expect(ids).not.toContain(inactive.id)
  })

  it('finds customers by name', () => {
    const created = expectSuccess(
      createCustomer(buildCustomerInput({ name: 'Maria Construcoes' }))
    )
    expectSuccess(createCustomer(buildCustomerInput({ name: 'Joao Ferragens' })))

    const results = expectSuccess(findCustomersByName('Maria'))
    const ids = results.map((customer: Customer) => customer.id)

    expect(ids).toContain(created.id)
  })

  it('rejects empty names', () => {
    const error = expectFailure(createCustomer(buildCustomerInput({ name: ' ' })))

    expect(error).toBe('Dados do cliente invalidos.')
  })

  it('normalizes empty optional fields to null', () => {
    const created = expectSuccess(
      createCustomer(
        buildCustomerInput({
          document: ' ',
          phone: '',
          address: ' '
        })
      )
    )

    expect(created.document).toBeNull()
    expect(created.phone).toBeNull()
    expect(created.address).toBeNull()
  })

  it('rejects negative credit limit', () => {
    const error = expectFailure(
      createCustomer(buildCustomerInput({ creditLimitInCents: -1 }))
    )

    expect(error).toBe('Dados do cliente invalidos.')
  })

  it('prevents duplicate document when it is filled', () => {
    expectSuccess(createCustomer(buildCustomerInput({ document: '12345678900' })))

    const error = expectFailure(
      createCustomer(buildCustomerInput({ document: '12345678900' }))
    )

    expect(error).toBe('Documento ja cadastrado.')
  })

  it('allows multiple customers without document', () => {
    const first = expectSuccess(createCustomer(buildCustomerInput({ document: null })))
    const second = expectSuccess(createCustomer(buildCustomerInput({ document: null })))

    expect(first.document).toBeNull()
    expect(second.document).toBeNull()
  })

  it('updates a customer without flagging its own document as duplicate', () => {
    const created = expectSuccess(
      createCustomer(buildCustomerInput({ document: '98765432100' }))
    )

    const updated = expectSuccess(
      updateCustomer(created.id, {
        name: 'Cliente atualizado',
        document: '98765432100',
        creditLimitInCents: 25000
      })
    )

    expect(updated.name).toBe('Cliente atualizado')
    expect(updated.creditLimitInCents).toBe(25000)
  })

  it('inactivates a customer', () => {
    const created = expectSuccess(createCustomer(buildCustomerInput()))
    const inactive = expectSuccess(inactivateCustomer(created.id))

    expect(inactive.isActive).toBe(false)
  })
})
