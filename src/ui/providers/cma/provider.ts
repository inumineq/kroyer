import { fetchJson, offsetHasMore } from '../shared'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { cmaToArtwork } from './mapper'
import type { CmaSearchResponse } from './types'

const API_BASE = 'https://openaccess-api.clevelandart.org/api'

const FIELDS = [
  'id',
  'accession_number',
  'title',
  'creators',
  'creation_date',
  'creation_date_earliest',
  'creation_date_latest',
  'technique',
  'department',
  'type',
  'images',
  'share_license_status',
  'url',
  'creditline',
].join(',')

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query.text.trim(),
    fields: FIELDS,
    limit: String(query.pageSize),
    skip: String(query.page * query.pageSize),
  })
  if (query.artist) params.set('artists', query.artist)
  if (query.publicDomainOnly) params.set('cc0', '1')
  if (query.hasImageOnly) params.set('has_image', '1')
  if (query.yearStart != null && query.yearEnd != null) {
    params.set('created_after', String(query.yearStart))
    params.set('created_before', String(query.yearEnd))
  }

  const data = await fetchJson<CmaSearchResponse>(
    'Cleveland Museum of Art search',
    `${API_BASE}/artworks/?${params}`,
    signal,
  )
  const items = (data.data ?? []).map(cmaToArtwork)
  const total = data.info?.total ?? items.length
  return {
    items,
    total,
    hasMore: offsetHasMore(query.page, query.pageSize, items.length, total),
  }
}

export const cmaProvider: ArtProvider = {
  id: 'cma',
  label: 'Cleveland Museum of Art',
  shortLabel: 'CMA',
  capabilities: {
    supportsArtistFilter: true,
    supportsPeriodFilter: true,
    supportsPublicDomainFilter: true,
    supportsHasImageFilter: true,
    needsApiKey: false,
    maxPageSize: 100,
  },
  domains: ['openaccess-api.clevelandart.org', 'openaccess-cdn.clevelandart.org'],
  imageLoading: 'iframe',
  search,
}
