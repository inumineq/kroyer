import { describe, expect, it } from 'vitest'
import { getProvider, isProviderId, listProviders } from './registry'

describe('isProviderId', () => {
  it('accepts registered providers', () => {
    for (const p of listProviders()) expect(isProviderId(p.id)).toBe(true)
  })

  it('rejects prototype-chain keys from corrupted storage', () => {
    expect(isProviderId('toString')).toBe(false)
    expect(isProviderId('constructor')).toBe(false)
    expect(isProviderId('__proto__')).toBe(false)
  })

  it('rejects non-strings and unknown ids', () => {
    expect(isProviderId(undefined)).toBe(false)
    expect(isProviderId(42)).toBe(false)
    expect(isProviderId('louvre')).toBe(false)
  })
})

describe('getProvider', () => {
  it('returns a provider with capabilities for every registered id', () => {
    for (const p of listProviders()) {
      expect(getProvider(p.id).capabilities).toBeDefined()
    }
  })

  it('declares an imageLoading strategy for every registered provider', () => {
    for (const p of listProviders()) {
      expect(['iframe', 'main-thread', 'blocked']).toContain(getProvider(p.id).imageLoading)
    }
  })

  it('marks AIC image bytes as blocked (Cloudflare 403s every sandboxed route)', () => {
    expect(getProvider('aic').imageLoading).toBe('blocked')
  })

  it('registers the Rijksmuseum keyless (data.rijksmuseum.nl needs no API key)', () => {
    expect(isProviderId('rijks')).toBe(true)
    expect(getProvider('rijks').capabilities.needsApiKey).toBe(false)
    expect(getProvider('rijks').imageLoading).toBe('iframe')
  })
})
