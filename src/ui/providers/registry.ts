import type { ProviderId } from '../../shared/model'
import type { ArtProvider } from './types'
import { smkProvider } from './smk/provider'
import { aicProvider } from './aic/provider'
import { cmaProvider } from './cma/provider'
import { metProvider } from './met/provider'

// Partial while the Rijksmuseum provider lands: 'rijks' is in ProviderId but
// registers in the next commit. Until then isProviderId('rijks') is honestly
// false and getProvider falls back to SMK.
const PROVIDERS: Partial<Record<ProviderId, ArtProvider>> = {
  smk: smkProvider,
  aic: aicProvider,
  cma: cmaProvider,
  met: metProvider,
}

export const DEFAULT_PROVIDER_ID: ProviderId = 'smk'

export function isProviderId(value: unknown): value is ProviderId {
  // hasOwnProperty, not `in`: stored junk like 'toString' must not pass
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value)
}

export function getProvider(id: ProviderId): ArtProvider {
  return PROVIDERS[id] ?? smkProvider
}

export function listProviders(): ArtProvider[] {
  return Object.values(PROVIDERS).filter((p): p is ArtProvider => p !== undefined)
}
