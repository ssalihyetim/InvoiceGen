import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CURRENCY,
  CONFIDENCE_THRESHOLD,
  roundMoney,
  lineGross,
  lineDiscountAmount,
  lineNet,
  totalsByCurrency,
  getPrimaryTotals,
  getCurrencySymbol,
  clampPercent,
  discountedUnitPrice,
  discountPercentFromTargetUnitPrice,
  type PriceLine,
} from '../pricing'

const line = (over: Partial<PriceLine> = {}): PriceLine => ({
  unitPrice: 100,
  quantity: 1,
  discountPercentage: 0,
  currency: 'TRY',
  ...over,
})

describe('roundMoney', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(4.9455)).toBe(4.95)
    expect(roundMoney(4.9444)).toBe(4.94)
    expect(roundMoney(10)).toBe(10)
  })

  it('handles the classic 1.005 float case', () => {
    expect(roundMoney(1.005)).toBe(1.01)
  })

  it('never leaves more than 2 decimals on a sum', () => {
    const v = roundMoney(0.1 + 0.2) // 0.30000000000000004
    expect(v).toBe(0.3)
  })
})

describe('line math', () => {
  it('computes gross / discount / net', () => {
    const l = line({ unitPrice: 12.34, quantity: 3, discountPercentage: 12.5 })
    expect(lineGross(l)).toBeCloseTo(37.02, 5)
    expect(lineDiscountAmount(l)).toBe(4.63) // 4.6275 -> 4.63
    expect(lineNet(l)).toBe(32.39) // 37.02 - 4.63
  })

  it('treats null/undefined unit price as 0 (Fiyat sorunuz items)', () => {
    const l = line({ unitPrice: null, quantity: 5, discountPercentage: 10 })
    expect(lineGross(l)).toBe(0)
    expect(lineDiscountAmount(l)).toBe(0)
    expect(lineNet(l)).toBe(0)
  })

  it('no discount means net equals gross', () => {
    const l = line({ unitPrice: 50, quantity: 4, discountPercentage: 0 })
    expect(lineNet(l)).toBe(200)
  })
})

describe('totalsByCurrency', () => {
  it('groups by currency and keeps gross/discount/net distinct', () => {
    const totals = totalsByCurrency([
      line({ unitPrice: 100, quantity: 2, discountPercentage: 10, currency: 'TRY' }), // gross 200, disc 20, net 180
      line({ unitPrice: 50, quantity: 1, discountPercentage: 0, currency: 'USD' }), // gross 50, net 50
    ])
    expect(totals['TRY']).toEqual({ total: 200, discount: 20, final: 180 })
    expect(totals['USD']).toEqual({ total: 50, discount: 0, final: 50 })
  })

  it('defaults a missing currency to TRY', () => {
    const totals = totalsByCurrency([line({ currency: null })])
    expect(totals[DEFAULT_CURRENCY]).toBeDefined()
  })

  it('header total equals the sum of rounded line nets (no penny drift)', () => {
    const lines = [
      line({ unitPrice: 12.34, quantity: 3, discountPercentage: 12.5 }), // net 32.39
      line({ unitPrice: 9.99, quantity: 7, discountPercentage: 3 }), // gross 69.93, disc 2.10, net 67.83
    ]
    const totals = totalsByCurrency(lines)
    const sumOfNets = lineNet(lines[0]) + lineNet(lines[1])
    expect(totals['TRY'].final).toBe(roundMoney(sumOfNets))
    // and it is genuinely 2-dp
    expect(Number.isInteger(totals['TRY'].final * 100)).toBe(true)
  })
})

describe('getPrimaryTotals', () => {
  const z = { total: 0, discount: 0, final: 0 }
  it('prefers TRY', () => {
    expect(
      getPrimaryTotals({ TRY: { total: 1, discount: 0, final: 1 }, USD: { total: 9, discount: 0, final: 9 } }),
    ).toEqual({ total: 1, discount: 0, final: 1 })
  })
  it('falls back to TL when no TRY', () => {
    expect(getPrimaryTotals({ TL: { total: 2, discount: 0, final: 2 } })).toEqual({ total: 2, discount: 0, final: 2 })
  })
  it('falls back to first available currency', () => {
    expect(getPrimaryTotals({ EUR: { total: 3, discount: 0, final: 3 } })).toEqual({ total: 3, discount: 0, final: 3 })
  })
  it('returns zeros for empty', () => {
    expect(getPrimaryTotals({})).toEqual(z)
  })
})

describe('getCurrencySymbol', () => {
  it('maps known currencies', () => {
    expect(getCurrencySymbol('TRY')).toBe('₺')
    expect(getCurrencySymbol('TL')).toBe('₺')
    expect(getCurrencySymbol('USD')).toBe('$')
    expect(getCurrencySymbol('EUR')).toBe('€')
  })
  it('falls back to the code for unknown, and to TRY symbol for null', () => {
    expect(getCurrencySymbol('GBP')).toBe('GBP')
    expect(getCurrencySymbol(null)).toBe('₺')
    expect(getCurrencySymbol(undefined)).toBe('₺')
  })
})

describe('clampPercent', () => {
  it('clamps into [0, 100]', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(33.333)).toBe(33.33)
  })
  it('treats non-finite input as 0', () => {
    expect(clampPercent(Infinity)).toBe(0)
    expect(clampPercent(NaN)).toBe(0)
  })
})

describe('discountedUnitPrice', () => {
  it('applies the discount to the list price', () => {
    expect(discountedUnitPrice(100, 10)).toBe(90)
    expect(discountedUnitPrice(12.34, 12.5)).toBe(10.8) // 10.7975 -> 10.80
  })
  it('treats null/undefined as 0', () => {
    expect(discountedUnitPrice(null, 10)).toBe(0)
    expect(discountedUnitPrice(100, null)).toBe(100)
  })
})

describe('discountPercentFromTargetUnitPrice', () => {
  it('back-computes the discount that yields a target net price', () => {
    expect(discountPercentFromTargetUnitPrice(100, 90)).toBe(10)
    expect(discountPercentFromTargetUnitPrice(200, 150)).toBe(25)
  })
  it('round-trips with discountedUnitPrice', () => {
    const pct = discountPercentFromTargetUnitPrice(100, 73)
    expect(pct).toBe(27)
    expect(discountedUnitPrice(100, pct)).toBe(73)
  })
  it('guards a zero/absent list price (no division by zero)', () => {
    expect(discountPercentFromTargetUnitPrice(0, 50)).toBe(0)
    expect(discountPercentFromTargetUnitPrice(null, 50)).toBe(0)
  })
  it('clamps a target above list price to 0% (no negative discount)', () => {
    expect(discountPercentFromTargetUnitPrice(100, 120)).toBe(0)
  })
})

describe('constants', () => {
  it('exposes the shared thresholds', () => {
    expect(DEFAULT_CURRENCY).toBe('TRY')
    expect(CONFIDENCE_THRESHOLD).toBe(0.3)
  })
})
