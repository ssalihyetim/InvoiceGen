// Shared in-memory model + DB mapping for quotation line items.
//
// Why this exists: app/quotations/new and app/quotations/[id]/edit are ~1000 near-identical
// lines each. The line-item LOGIC (effective price after an inline edit, building the
// quotation_items insert rows, detecting which catalog prices were edited, detecting
// zero-price lines) is the error-prone part and must behave identically on both pages, so
// it lives here once. The JSX still lives per-page (the two tables differ slightly).
//
// Features served:
//   F1 manual (off-catalog) items   -> manual flag + makeManualProduct + manual_* columns
//   F2 inline list-price edit        -> unit_price_override / price_edited + effectiveUnitPrice
//   F3 "save edited price to catalog"-> getEditedCatalogPrices
//   F7 zero-price guard              -> getZeroPriceLines

import { lineNet, lineDiscountAmount, type PriceLine } from './pricing'

// Structural shape of a product on a line. Permissive so both pages' local Product
// types (and the synthetic manual product) are assignable to it.
export interface QuoteProductLike {
  id: string
  product_type: string
  diameter: string | null
  product_code: string | null
  base_price: number
  currency: string | null
  unit: string | null
  description: string | null
}

export interface QuoteLineItem {
  product: QuoteProductLike
  quantity: number
  discount_percentage: number
  ai_matched: boolean
  original_request?: string
  // F1: off-catalog item (no product_id; descriptive fields stored on the row).
  manual?: boolean
  // F1: when adding a manual item, also insert it into the products catalog on save.
  add_to_catalog?: boolean
  // F2: inline-edited unit (list) price. effectiveUnitPrice() falls back to base_price.
  unit_price_override?: number | null
  // F2: UI lock state for the price input (purely presentational).
  price_unlocked?: boolean
  // F2/F3: the user actually changed the price THIS session (drives strikethrough + the
  // "save to catalog" prompt). Kept distinct from unit_price_override so a price loaded
  // from an existing quote is preserved without being mistaken for a fresh edit.
  price_edited?: boolean
}

// The undiscounted unit price actually used on the line: an inline edit if present,
// otherwise the catalog/base price.
export function effectiveUnitPrice(item: QuoteLineItem): number {
  if (item.unit_price_override != null) return item.unit_price_override
  return item.product?.base_price ?? 0
}

// PriceLine for the lib/pricing money math.
export function toPriceLine(item: QuoteLineItem): PriceLine {
  return {
    unitPrice: effectiveUnitPrice(item),
    quantity: item.quantity,
    discountPercentage: item.discount_percentage,
    currency: item.product?.currency,
  }
}

// Build a synthetic product for an off-catalog (manual) line, or to rehydrate a manual
// line loaded from the DB. id === '' marks it as not-in-catalog.
export function makeManualProduct(input: {
  name: string
  code?: string | null
  unit?: string | null
  price: number
  currency?: string | null
}): QuoteProductLike {
  return {
    id: '',
    product_type: input.name,
    diameter: null,
    product_code: input.code?.trim() || null,
    base_price: input.price,
    currency: input.currency || 'EUR',
    unit: input.unit?.trim() || 'adet',
    description: null,
  }
}

// A row ready to insert into quotation_items, shared by new + edit save paths.
export interface QuotationItemRow {
  quotation_id: string
  tenant_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  list_price: number | null
  currency: string | null
  discount_percentage: number
  discount_amount: number
  subtotal: number
  ai_matched: boolean
  original_request: string | null
  manual_name: string | null
  manual_code: string | null
  manual_unit: string | null
}

export function buildQuotationItemRows(
  items: QuoteLineItem[],
  ctx: { quotationId: string; tenantId: string },
): QuotationItemRow[] {
  return items
    .filter((item) => item.product)
    .map((item) => {
      const line = toPriceLine(item)
      const isManual = !!item.manual || !item.product.id
      return {
        quotation_id: ctx.quotationId,
        tenant_id: ctx.tenantId,
        product_id: isManual ? null : item.product.id,
        quantity: item.quantity,
        unit_price: effectiveUnitPrice(item),
        // Catalog reference price (so a quote keeps "we quoted X vs catalog Y").
        list_price: isManual ? null : item.product.base_price ?? null,
        currency: item.product.currency,
        discount_percentage: item.discount_percentage,
        discount_amount: lineDiscountAmount(line),
        subtotal: lineNet(line),
        ai_matched: item.ai_matched || false,
        original_request: item.original_request || null,
        manual_name: isManual ? item.product.product_type : null,
        manual_code: isManual ? item.product.product_code : null,
        manual_unit: isManual ? item.product.unit : null,
      }
    })
}

export interface EditedCatalogPrice {
  product_id: string
  code: string | null
  name: string
  oldPrice: number
  newPrice: number
  currency: string | null
}

// F3: catalog (non-manual) lines whose price the user edited this session and whose new
// price differs from the catalog base_price. These are offered for "save to Main List".
export function getEditedCatalogPrices(items: QuoteLineItem[]): EditedCatalogPrice[] {
  const out: EditedCatalogPrice[] = []
  for (const item of items) {
    if (item.manual || !item.product?.id) continue
    if (!item.price_edited || item.unit_price_override == null) continue
    if (item.unit_price_override === item.product.base_price) continue
    out.push({
      product_id: item.product.id,
      code: item.product.product_code,
      name: item.product.product_type,
      oldPrice: item.product.base_price ?? 0,
      newPrice: item.unit_price_override,
      currency: item.product.currency,
    })
  }
  // De-dup by product_id (same product can appear on multiple lines); last edit wins.
  const byId = new Map<string, EditedCatalogPrice>()
  for (const e of out) byId.set(e.product_id, e)
  return Array.from(byId.values())
}

// F7: lines whose effective unit price is 0 ("Fiyat sorunuz") — block sent/approved.
export function getZeroPriceLines(items: QuoteLineItem[]): QuoteLineItem[] {
  return items.filter((item) => item.product && effectiveUnitPrice(item) <= 0)
}
