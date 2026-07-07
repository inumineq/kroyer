import { describe, expect, it } from 'vitest'
import { estimateBytes, QUOTA_MAX_BYTES, QUOTA_WARN_BYTES, quotaStatus } from './quota'

describe('estimateBytes', () => {
  it('counts UTF-8 bytes of the JSON encoding', () => {
    expect(estimateBytes({ a: 1 })).toBe('{"a":1}'.length)
    // ø is 2 bytes in UTF-8
    expect(estimateBytes('ø')).toBe('"ø"'.length + 1)
  })

  it('returns 0 for undefined', () => {
    expect(estimateBytes(undefined)).toBe(0)
  })
})

describe('quotaStatus', () => {
  it('is ok for small values', () => {
    expect(quotaStatus({ collections: [] })).toBe('ok')
  })

  it('warns above the warn threshold', () => {
    expect(quotaStatus('x'.repeat(QUOTA_WARN_BYTES))).toBe('warn')
  })

  it('is full above the max threshold', () => {
    expect(quotaStatus('x'.repeat(QUOTA_MAX_BYTES))).toBe('full')
  })
})
