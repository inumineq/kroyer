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
  'medium_display',
  'credit_line',
  'department_title',
  'artwork_type_title',
].join(',')

/** AIC's search endpoint caps accessible results at 1000 (page * limit). */
const MAX_RESULTS = 1000

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  // No dedicated artist filter — fold the artist into the full-text query.
  const text = [query.text.trim(), query.artist?.trim()].filter(Boolean).join(' ')

  const params = new URLSearchParams({
    q: text,
    fields: FIELDS,
    limit: String(query.pageSize),
    page: String(query.page + 1), // AIC pages are 1-based
  })
  if (query.publicDomainOnly) {
    params.set('query[term][is_public_domain]', 'true')
  }

  const res = await fetch(`${API_BASE}/artworks/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Art Institute of Chicago search failed: ${res.status}`)

  const data: AicSearchResponse = await res.json()
  const items = (data.data ?? []).map(aicToArtwork)
  const total = data.pagination?.total ?? items.length
  const reachable = Math.min(total, MAX_RESULTS)
  return {
    items,
    total,
    hasMore: (query.page + 1) * query.pageSize < reachable,
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
    supportsSimilar: false,
    supportsCorrections: false,
    needsApiKey: false,
    maxImageSizePx: 1686,
    maxPageSize: 100,
  },
  domains: ['api.artic.edu', 'www.artic.edu'],
  search,
}
