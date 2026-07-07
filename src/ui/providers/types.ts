import type { Artwork, ProviderId } from '../../shared/model'

export type ProviderCapabilities = {
  supportsArtistFilter: boolean
  supportsPeriodFilter: boolean
  /**
   * False when the provider's corpus is already public-domain-only or the API
   * cannot filter by rights — the UI hides the toggle in that case.
   */
  supportsPublicDomainFilter: boolean
  supportsHasImageFilter: boolean
  supportsSimilar: boolean
  /** Did-you-mean spelling corrections in search responses */
  supportsCorrections: boolean
  needsApiKey: boolean
  /** Provider-side cap on requestable image width, when known */
  maxImageSizePx?: number
  maxPageSize: number
}

export type SearchQuery = {
  text: string
  artist?: string
  yearStart?: number
  yearEnd?: number
  publicDomainOnly: boolean
  hasImageOnly: boolean
  /** 0-based; the provider translates to its own offset/skip/page scheme */
  page: number
  pageSize: number
}

export type SearchPage = {
  items: Artwork[]
  total: number
  hasMore: boolean
  corrections?: string[]
}

export interface ArtProvider {
  readonly id: ProviderId
  /** Full picker label, e.g. "SMK — National Gallery of Denmark" */
  readonly label: string
  /** Compact label for badges and style names, e.g. "SMK" */
  readonly shortLabel: string
  readonly capabilities: ProviderCapabilities
  /** Hosts this provider fetches from; must all appear in manifest.json networkAccess */
  readonly domains: string[]
  search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage>
  getSimilar?(work: Artwork, signal?: AbortSignal): Promise<Artwork[]>
}
