// Single source of truth for quotation money math, currency display, and the
// match-confidence threshold.
//
// Why this exists: before this module the item-total / per-currency / discount math was
// inlined and drifted across app/quotations/new, app/quotations/[id]/edit and
// app/quotations/page.tsx (audit B-1/B-2/C-3): the currency fallback was 'TRY' in some
// places and 'TL' in others, the match threshold 0.3 was hardcoded in 7 call sites, and
// no value was rounded to 2 decimals before being written to the accounting document
// (floats like 4.9455 reached the DB). All of that now lives here, tested in
// lib/__tests__/pricing.test.ts.

export const DEFAULT_CURRENCY = 'TRY'

// Client-side gate: matches below this confidence are not auto-added to a quotation.
// The edge function (match-product) has its own server-side MIN_CONFIDENCE = 0.35 which
// is the harder backstop; this is the UI threshold the pages have always used (0.3).
export const CONFIDENCE_THRESHOLD = 0.3

// Round to 2 decimal places for money. Number.EPSILON nudge avoids the classic
// (1.005).toFixed problem so e.g. roundMoney(4.9455) === 4.95.
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface PriceLine {
  unitPrice: number | null | undefined
  quantity: number
  discountPercentage: number
  currency: string | null | undefined
}

export interface CurrencyTotals {
  total: number // gross (before discount)
  discount: number // discount amount
  final: number // net (after discount)
}

export function lineGross(line: PriceLine): number {
  return (line.unitPrice || 0) * (line.quantity || 0)
}

export function lineDiscountAmount(line: PriceLine): number {
  return roundMoney(lineGross(line) * ((line.discountPercentage || 0) / 100))
}

// Net total for a single line, rounded — used for the per-item `subtotal` DB write.
export function lineNet(line: PriceLine): number {
  return roundMoney(lineGross(line) - lineDiscountAmount(line))
}

// Group lines by currency, accumulating rounded per-line values so the header total
// always equals the sum of the displayed line items (no penny drift on the document).
export function totalsByCurrency(lines: PriceLine[]): Record<string, CurrencyTotals> {
  const byCurrency: Record<string, CurrencyTotals> = {}
  for (const line of lines) {
    const currency = line.currency || DEFAULT_CURRENCY
    if (!byCurrency[currency]) {
      byCurrency[currency] = { total: 0, discount: 0, final: 0 }
    }
    const gross = roundMoney(lineGross(line))
    const discount = lineDiscountAmount(line)
    byCurrency[currency].total += gross
    byCurrency[currency].discount += discount
    byCurrency[currency].final += gross - discount
  }
  // Round accumulators to clear floating-point dust from summation.
  for (const c of Object.keys(byCurrency)) {
    byCurrency[c].total = roundMoney(byCurrency[c].total)
    byCurrency[c].discount = roundMoney(byCurrency[c].discount)
    byCurrency[c].final = roundMoney(byCurrency[c].final)
  }
  return byCurrency
}

// Pick the headline totals for a multi-currency quotation: prefer TRY (current standard),
// then TL (legacy rows), then whatever currency is present, else zeros.
export function getPrimaryTotals(byCurrency: Record<string, CurrencyTotals>): CurrencyTotals {
  return (
    byCurrency[DEFAULT_CURRENCY] ||
    byCurrency['TL'] ||
    Object.values(byCurrency)[0] || { total: 0, discount: 0, final: 0 }
  )
}

// Clamp a percentage into the [0, 100] range and round to 2 decimals (the DB column
// is DECIMAL(5,2)). Non-finite input (e.g. division by a zero list price) becomes 0.
export function clampPercent(pct: number): number {
  if (!Number.isFinite(pct)) return 0
  return Math.min(100, Math.max(0, roundMoney(pct)))
}

// The discounted (net) unit price implied by a list price + discount percentage.
// This is what the quote shows as "İskonto Birim Fiyat".
export function discountedUnitPrice(
  listPrice: number | null | undefined,
  discountPercentage: number | null | undefined,
): number {
  return roundMoney((listPrice || 0) * (1 - (discountPercentage || 0) / 100))
}

// Inverse of discountedUnitPrice: given a list price and a desired net unit price,
// return the discount percentage that produces it. Powers the "target net price"
// line editor (F6) so a salesperson can type the price they want and have the
// discount back-computed. Guards a zero/absent list price (no meaningful percentage)
// and clamps to [0, 100] so a target above list price doesn't yield a negative discount.
export function discountPercentFromTargetUnitPrice(
  listPrice: number | null | undefined,
  targetUnitPrice: number,
): number {
  const lp = listPrice || 0
  if (lp <= 0) return 0
  return clampPercent((1 - targetUnitPrice / lp) * 100)
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  switch (currency ?? DEFAULT_CURRENCY) {
    case 'TRY':
    case 'TL':
      return '₺'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    default:
      return currency ?? DEFAULT_CURRENCY
  }
}
