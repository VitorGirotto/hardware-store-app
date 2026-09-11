import { describe, expect, it } from 'vitest'
import { calculateMarkup, calculateSalePrice, parsePriceInCents, updateProductPricing } from './product-pricing'

const initial = { costPrice: '20.00', salePrice: '36.00', markupPercentage: '80' }

describe('product pricing', () => {
  it.each([[100, 0.5, 101], [2000, 80, 3600], [2000, 0, 2000], [2000, -100, 0], [2000, -50, 1000], [2000, 150, 5000], [1999, 12.5, 2249], [0, 80, 0]])(
    'calculates cost %s with markup %s as %s cents', (cost, markup, expected) => {
      expect(calculateSalePrice(cost, markup)).toBe(expected)
    }
  )

  it('recalculates sale when cost or margin changes', () => {
    expect(updateProductPricing(initial, 'costPrice', '30,00').salePrice).toBe('54.00')
    expect(updateProductPricing(initial, 'markupPercentage', '12,5').salePrice).toBe('22.50')
    expect(updateProductPricing(initial, 'markupPercentage', '12.5').salePrice).toBe('22.50')
  })

  it('recalculates the margin when sale is edited, including a loss', () => {
    expect(updateProductPricing(initial, 'salePrice', '30').markupPercentage).toBe('50.00')
    expect(updateProductPricing(initial, 'salePrice', '10').markupPercentage).toBe('-50.00')
    expect(calculateMarkup(300, 400)).toBe(33.33)
  })

  it('clears margin without changing sale or enabling automatic calculation', () => {
    const cleared = updateProductPricing(initial, 'markupPercentage', '')
    expect(cleared.salePrice).toBe('36.00')
    expect(updateProductPricing(cleared, 'costPrice', '30').salePrice).toBe('36.00')
  })

  it('handles zero cost and manual sale without division by zero', () => {
    const zeroCost = updateProductPricing(initial, 'costPrice', '0')
    expect(zeroCost.salePrice).toBe('0.00')
    expect(updateProductPricing(zeroCost, 'salePrice', '10').markupPercentage).toBe('')
    expect(calculateMarkup(0, 1000)).toBeNull()
  })

  it.each(['abc', '-', '-101', 'Infinity', '1,2,3', '1e309'])(
    'does not change sale for invalid margin %s', (value) => {
      expect(updateProductPricing(initial, 'markupPercentage', value).salePrice).toBe('36.00')
    }
  )

  it('preserves other fields during invalid price edits', () => {
    expect(updateProductPricing(initial, 'costPrice', '-1').salePrice).toBe('36.00')
    expect(updateProductPricing(initial, 'costPrice', '').salePrice).toBe('36.00')
    expect(updateProductPricing(initial, 'salePrice', 'invalid').markupPercentage).toBe('80')
    expect(parsePriceInCents('1.005')).toBe(101)
    expect(parsePriceInCents('99999999999999999')).toBeNull()
  })

  it('preserves the chosen percentage despite price rounding', () => {
    const result = updateProductPricing({ ...initial, costPrice: '0.01' }, 'markupPercentage', '80')
    expect(result.salePrice).toBe('0.02')
    expect(result.markupPercentage).toBe('80')
  })
})
