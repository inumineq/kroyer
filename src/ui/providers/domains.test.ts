import { describe, expect, it } from 'vitest'
import manifest from '../../../manifest.json'
import { listProviders } from './registry'

/**
 * Figma only allows fetches to manifest-declared hosts. A provider whose
 * domain is missing from the manifest ships broken, so enforce the invariant
 * at build time.
 */
describe('provider domains vs manifest networkAccess', () => {
  const allowed = new Set(
    manifest.networkAccess.allowedDomains.map((d) => d.replace(/^https:\/\//, '')),
  )

  for (const provider of listProviders()) {
    it(`${provider.id}: every domain is allowlisted`, () => {
      for (const domain of provider.domains) {
        expect(allowed, `manifest.json is missing https://${domain}`).toContain(domain)
      }
    })
  }
})
