import type { ProviderId } from '../../shared/model'
import type { ArtProvider } from './types'
import { smkProvider } from './smk/provider'

const PROVIDERS: Partial<Record<ProviderId, ArtProvider>> = {
  smk: smkProvider,
}

export const DEFAULT_PROVIDER_ID: ProviderId = 'smk'

export function getProvider(id: ProviderId): ArtProvider {
  return PROVIDERS[id] ?? smkProvider
}

export function listProviders(): ArtProvider[] {
  return Object.values(PROVIDERS)
}
