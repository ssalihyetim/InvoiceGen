import { describe, it, expect } from 'vitest'
import {
  normalizeStatus,
  QUOTATION_STATUSES,
  SELECTABLE_STATUSES,
  STATUS_LABELS,
} from '../quotation-status'

describe('normalizeStatus', () => {
  it('maps the legacy "accepted" value to "approved"', () => {
    expect(normalizeStatus('accepted')).toBe('approved')
  })

  it('passes through every canonical status unchanged', () => {
    for (const s of QUOTATION_STATUSES) {
      expect(normalizeStatus(s)).toBe(s)
    }
  })

  it('falls back to "draft" for unknown values', () => {
    expect(normalizeStatus('garbage')).toBe('draft')
    expect(normalizeStatus('')).toBe('draft')
  })
})

describe('SELECTABLE_STATUSES', () => {
  it('excludes the system-only "expired" status', () => {
    expect(SELECTABLE_STATUSES).not.toContain('expired')
  })

  it('is a subset of the canonical statuses', () => {
    for (const s of SELECTABLE_STATUSES) {
      expect(QUOTATION_STATUSES).toContain(s)
    }
  })
})

describe('STATUS_LABELS', () => {
  it('has a label for every canonical status', () => {
    for (const s of QUOTATION_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy()
    }
  })
})
