import { fetchJson } from '../shared'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { aicToArtwork } from './mapper'
import type { AicSearchResponse } from './types'

const API_BASE = 'https://api.artic.edu/api/v1'

const FIELDS = [
  'id',
  'title',
  'artist_display',
  'date_display',
  'date_start',
  'date_end',
  'is_public_domain',
  'image_id',
  'thumbnail',
  'medium_display',
  'credit_line',
  'department_title',
  'artwork_type_title',
].join(',')

/** AIC's search endpoint caps accessible results at 1000 (page * limit). */
const MAX_RESULTS = 1000

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query.text.trim(),
    fields: FIELDS,
    limit: String(query.pageSize),
    page: String(query.page + 1), // AIC pages are 1-based
  })
  if (query.publicDomainOnly) {
    params.set('query[term][is_public_domain]', 'true')
  }

  const data = await fetchJson<AicSearchResponse>(
    'Art Institute of Chicago search',
    `${API_BASE}/artworks/search?${params}`,
    signal,
  )
  const items = (data.data ?? []).map(aicToArtwork)
  const total = data.pagination?.total ?? items.length
  // The NEXT request (1-based page + 2) must stay within the access cap:
  // its window ends at (page + 2) * pageSize records.
  const nextRequestOk = (query.page + 2) * query.pageSize <= MAX_RESULTS
  return {
    items,
    total,
    hasMore: nextRequestOk && (query.page + 1) * query.pageSize < total,
  }
}

export const aicProvider: ArtProvider = {
  id: 'aic',
  label: 'Art Institute of Chicago',
  shortLabel: 'AIC',
  capabilities: {
    supportsArtistFilter: false,
    supportsPeriodFilter: false,
    supportsPublicDomainFilter: true,
    supportsHasImageFilter: false,
    needsApiKey: false,
    maxPageSize: 100,
  },
  domains: ['api.artic.edu', 'www.artic.edu'],
  // www.artic.edu sits behind a Cloudflare managed challenge that blocks
  // sandboxed null-origin iframe fetches (the plugin UI) but allows normal
  // page-context requests — route image bytes through the plugin main thread.
  imageLoading: 'main-thread',
  search,
}
