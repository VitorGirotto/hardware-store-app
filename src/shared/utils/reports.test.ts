import { describe, expect, it } from 'vitest'
import { allocateSaleDiscount } from './reports'

describe('discount allocation', () => {
  it('assigns remaining cents by largest remainder, then lowest item ID', () => {
    expect(allocateSaleDiscount([{ id: 3, totalInCents: 100 }, { id: 2, totalInCents: 100 }, { id: 1, totalInCents: 100 }], 2)).toEqual(new Map([[1, 99], [2, 99], [3, 100]]))
    expect(allocateSaleDiscount([{ id: 1, totalInCents: 100 }, { id: 2, totalInCents: 200 }], 1)).toEqual(new Map([[2, 199], [1, 100]]))
  })
  it('preserves cents when intermediate multiplication exceeds Number precision', () => {
    const result = allocateSaleDiscount([{ id: 1, totalInCents: 1000000001 }, { id: 2, totalInCents: 1000000000 }], 1000000001)
    expect([...result.values()].reduce((a, b) => a + b, 0)).toBe(1000000000)
  })
})
