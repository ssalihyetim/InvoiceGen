import { describe, it, expect } from 'vitest'
import {
  effectiveUnitPrice,
  toPriceLine,
  makeManualProduct,
  buildQuotationItemRows,
  getEditedCatalogPrices,
  getZeroPriceLines,
  type QuoteLineItem,
  type QuoteProductLike,
} from '../quote-items'

const product = (over: Partial<QuoteProductLike> = {}): QuoteProductLike => ({
  id: 'p1',
  product_type: 'Boru',
  diameter: 'D90',
  product_code: '001',
  base_price: 100,
  currency: 'EUR',
  unit: 'metre',
  description: null,
  ...over,
})

const item = (over: Partial<QuoteLineItem> = {}): QuoteLineItem => ({
  product: product(),
  quantity: 2,
  discount_percentage: 0,
  ai_matched: false,
  ...over,
})

describe('effectiveUnitPrice', () => {
  it('uses the catalog base price by default', () => {
    expect(effectiveUnitPrice(item())).toBe(100)
  })
  it('uses the inline override when present (including 0)', () => {
    expect(effectiveUnitPrice(item({ unit_price_override: 80 }))).toBe(80)
    expect(effectiveUnitPrice(item({ unit_price_override: 0 }))).toBe(0)
  })
})

describe('toPriceLine', () => {
  it('maps the line to the pricing shape using the effective price', () => {
    const l = toPriceLine(item({ unit_price_override: 90, discount_percentage: 10 }))
    expect(l).toEqual({ unitPrice: 90, quantity: 2, discountPercentage: 10, currency: 'EUR' })
  })
})

describe('makeManualProduct', () => {
  it('builds a synthetic product with empty id and EUR default', () => {
    const p = makeManualProduct({ name: 'Özel flanş', price: 50 })
    expect(p.id).toBe('')
    expect(p.product_type).toBe('Özel flanş')
    expect(p.currency).toBe('EUR')
    expect(p.unit).toBe('adet')
    expect(p.product_code).toBe(null)
  })
})

describe('buildQuotationItemRows', () => {
  const ctx = { quotationId: 'q1', tenantId: 't1' }

  it('writes catalog rows with product_id, list_price=base, unit_price=effective', () => {
    const rows = buildQuotationItemRows([item({ unit_price_override: 80, discount_percentage: 10 })], ctx)
    expect(rows[0]).toMatchObject({
      product_id: 'p1',
      unit_price: 80,
      list_price: 100, // catalog reference preserved
      discount_percentage: 10,
      discount_amount: 16, // 80*2*10%
      subtotal: 144, // 160 - 16
      manual_name: null,
      manual_code: null,
    })
  })

  it('writes manual rows with null product_id and the manual_* fields', () => {
    const manual = item({
      product: makeManualProduct({ name: 'Özel', code: 'X', unit: 'adet', price: 25 }),
      manual: true,
      quantity: 4,
    })
    const rows = buildQuotationItemRows([manual], ctx)
    expect(rows[0]).toMatchObject({
      product_id: null,
      unit_price: 25,
      list_price: null,
      manual_name: 'Özel',
      manual_code: 'X',
      manual_unit: 'adet',
    })
  })

  it('skips items without a product', () => {
    const rows = buildQuotationItemRows([{ ...item(), product: undefined as any }], ctx)
    expect(rows).toHaveLength(0)
  })
})

describe('getEditedCatalogPrices', () => {
  it('returns only catalog lines the user actually edited to a different price', () => {
    const changes = getEditedCatalogPrices([
      item({ unit_price_override: 80, price_edited: true }), // edited -> included
      item({ unit_price_override: 100, price_edited: true }), // same as base -> excluded
      item({ unit_price_override: 70, price_edited: false }), // loaded, not edited -> excluded
      item({ product: makeManualProduct({ name: 'M', price: 5 }), manual: true, unit_price_override: 9, price_edited: true }), // manual -> excluded
    ])
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ product_id: 'p1', oldPrice: 100, newPrice: 80 })
  })

  it('de-dupes by product_id (last edit wins)', () => {
    const changes = getEditedCatalogPrices([
      item({ unit_price_override: 80, price_edited: true }),
      item({ unit_price_override: 75, price_edited: true }),
    ])
    expect(changes).toHaveLength(1)
    expect(changes[0].newPrice).toBe(75)
  })
})

describe('getZeroPriceLines', () => {
  it('flags lines whose effective price is 0', () => {
    const zero = getZeroPriceLines([
      item({ unit_price_override: 0 }),
      item({ product: product({ base_price: 0 }) }),
      item({ unit_price_override: 5 }),
    ])
    expect(zero).toHaveLength(2)
  })
})
