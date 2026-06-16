import { describe, it, expect } from 'vitest'
import {
  normalizeText,
  extractDimensions,
  productHasDiameter,
  getCanonicalTypes,
  typeKeywordInText,
  parseCustomerRequest,
  calculateWeightedScore,
  scoreAndGate,
} from '../index.ts'

// Regression net for the PURE parsing/scoring logic of the matching engine. This is the
// layer where the 2026-06-09 "0.4-BORU" catastrophe lived: requests for fittings (DİRSEK,
// REDÜKSİYON, …) were silently matched to an unrelated BORU at a flat 0.4 confidence.
// The end-to-end golden set (request -> correct product code) needs the live catalog and
// is a separate DB-backed integration test; here we lock the deterministic logic.

describe('normalizeText', () => {
  it('unifies the degree sign U+00B0 (°) to the catalog form U+00BA (º)', () => {
    expect(normalizeText('90°')).toBe('90º')
    expect(normalizeText('45° DİRSEK')).toContain('º')
    expect(normalizeText('45° DİRSEK')).not.toContain('°')
  })

  it('collapses whitespace and trims', () => {
    expect(normalizeText('  A   B  ')).toBe('A B')
  })
})

describe('extractDimensions', () => {
  it('separates an angle (90) from a diameter (355) — no fake "90-355" pattern', () => {
    const d = extractDimensions('DİRSEK 90º 355MM')
    expect(d.primaryDiameter).toBe('355')
    expect(d.diameters).toContain('355')
    expect(d.diameters).not.toContain('90')
    expect(d.angles).toContain('90')
    expect(d.reductionPattern).toBeUndefined()
  })

  it('extracts a reduction pattern from D110*D90', () => {
    const d = extractDimensions('D110*D90 PN16 EF Redüksiyon')
    expect(d.reductionPattern).toBe('110x90')
    expect(d.diameters).toEqual(expect.arrayContaining(['110', '90']))
    expect(d.primaryDiameter).toBe('110')
  })

  it('reads a D-prefixed diameter and does not treat a pressure class (PN16) as a diameter', () => {
    const d = extractDimensions('001 117 0021 0050 D50 PN16 90° Spigot Dirsek')
    expect(d.primaryDiameter).toBe('50')
    expect(d.diameters).toContain('50')
    expect(d.diameters).not.toContain('16')
    expect(d.angles).toContain('90')
  })
})

describe('productHasDiameter', () => {
  it('matches a diameter with an optional MM suffix', () => {
    expect(productHasDiameter('BORU PE100 355MM', '355')).toBe(true)
    expect(productHasDiameter('DİRSEK 355 MM', '355')).toBe(true)
  })

  it('does not match a diameter that is only a substring of a larger number', () => {
    expect(productHasDiameter('1355MM', '355')).toBe(false)
  })
})

describe('canonical type detection', () => {
  it('maps Turkish and ASCII spellings to the same canonical type', () => {
    expect(getCanonicalTypes('DİRSEK').has('DİRSEK')).toBe(true)
    expect(getCanonicalTypes('DIRSEK').has('DİRSEK')).toBe(true)
    expect(getCanonicalTypes('BORU PE100').has('BORU')).toBe(true)
  })

  it('matches a keyword across its spelling variants (İ/I)', () => {
    expect(typeKeywordInText('EF DİRSEK 90º', 'DIRSEK')).toBe(true)
  })
})

describe('parseCustomerRequest', () => {
  it('does not mistake a numeric customer catalog code for a (hyphenated) product code', () => {
    const p = parseCustomerRequest('001 117 0021 0050 D50 PN16 90° Spigot Dirsek')
    expect(p.productCode).toBeUndefined()
    expect(p.primaryDiameter).toBe('50')
  })

  it('detects a real hyphenated product code', () => {
    const p = parseCustomerRequest('NTG-EF-63 EF MANŞON')
    expect(p.productCode).toBe('NTG-EF-63')
  })

  // The 0042-vs-2042 bug: the request line carries the exact (unique) NTG catalog code of a
  // SPIGOT product but also the noise word "EF"; the code must be captured so exactMatch can
  // pin the right product before the "EF" keyword drags scoring to the EF variant.
  it('captures the NTG catalog code (3-3-4-4) even when the line also says "EF"', () => {
    const p = parseCustomerRequest('001 117 0042 0127 D125*D90 PN16 EF İnegöl TE')
    expect(p.catalogCode).toBe('001 117 0042 0127')
    expect(p.productCode).toBeUndefined() // not a hyphenated code
  })

  it('normalises whitespace in the catalog code and leaves it undefined when absent', () => {
    expect(parseCustomerRequest('001  117   0021 0050 D50').catalogCode).toBe('001 117 0021 0050')
    expect(parseCustomerRequest('EF MANŞON 63').catalogCode).toBeUndefined()
  })
})

describe('calculateWeightedScore hard gates (the 0.4-BORU protection)', () => {
  const dirsekReq = parseCustomerRequest('DİRSEK 90º 355MM')

  it('HARD GATE 1: rejects a product missing the requested diameter', () => {
    const r = calculateWeightedScore(
      { search_text: 'BORU PE100 PN16 200MM', product_type: 'BORU' },
      dirsekReq,
    )
    expect(r.rejected).toBe(true)
    expect(r.score).toBe(0)
  })

  it('HARD GATE 2: rejects an opposite structural type (BORU) for a fitting (DİRSEK) request, even when the diameter matches', () => {
    const r = calculateWeightedScore(
      { search_text: 'BORU PE100 355MM', product_type: 'BORU' },
      dirsekReq,
    )
    expect(r.rejected).toBe(true)
  })

  it('accepts the correct fitting with a matching diameter and scores it', () => {
    const r = calculateWeightedScore(
      { search_text: 'DİRSEK 90º 355MM PE100', product_type: 'DİRSEK 90º' },
      dirsekReq,
    )
    expect(r.rejected).toBe(false)
    expect(r.score).toBeGreaterThan(0)
  })
})

describe('scoreAndGate', () => {
  it('drops gated candidates, keeps valid ones, and caps confidence', () => {
    const parsed = parseCustomerRequest('DİRSEK 90º 355MM')
    const correct = { id: 'good', search_text: 'DİRSEK 90º 355MM PE100', product_type: 'DİRSEK' }
    const wrongDia = { id: 'bad-dia', search_text: 'DİRSEK 90º 200MM', product_type: 'DİRSEK' }
    const wrongType = { id: 'bad-type', search_text: 'BORU 355MM', product_type: 'BORU' }

    const out = scoreAndGate([correct, wrongDia, wrongType], parsed, 0.5, 0.4, 0.95, 'test', 0)

    expect(out).toHaveLength(1)
    expect(out[0].product_id).toBe('good')
    expect(out[0].confidence).toBeLessThanOrEqual(0.95)
    expect(out[0].strategy).toBe('fulltext')
  })
})
