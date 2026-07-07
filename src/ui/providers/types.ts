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
  /** Reserved for keyed providers (Rijksmuseum etc.) in a later phase */
  needsApiKey: boolean
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
  /**
   * How image bytes are fetched for this provider's works. 'iframe' is the
   * default direct `<img>` / UI-side fetch(). 'main-thread' routes bytes
   * through the plugin controller for hosts that block sandboxed iframe
   * requests — kept as the flip-back switch, machinery intact and tested.
   * 'blocked' means neither transport works: AIC's Cloudflare managed
   * challenge 403s BOTH the iframe (null-origin) AND the plugin main-thread
   * fetch sandbox AND figma.createImageAsync's cors-image-proxy.figma.com
   * (verified live 2026-07-07 — see TECH-NOTES.md). Blocked providers never
   * fire an image fetch; the UI shows lqip + an "Open on <museum>" link and
   * disables insert/palette/mood-board for those works.
   */
  readonly imageLoading: 'iframe' | 'main-thread' | 'blocked'
  search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage>
  getSimilar?(work: Artwork, signal?: AbortSignal): Promise<Artwork[]>
}
