import type { Artwork } from '../../../shared/model'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { smkToArtwork } from './mapper'
import type { SmkArtwork, SmkSearchResponse } from './types'

const API_BASE = 'https://api.smk.dk/api/v1'

/**
 * Only request the fields the UI actually uses — the default payload is much
 * larger. NOTE: validated against SMK's documented API, but not against the
 * live endpoint from this environment; smoke-test before release.
 */
const FIELDS = [
  'id',
  'object_number',
  'titles',
  'artist',
  'production_date',
  'techniques',
  'object_names',
  'has_image',
  'public_domain',
  'image_thumbnail',
  'image_native',
  'image_width',
  'image_height',
  'frontend_url',
  'similar_images_url',
  'credit_line',
  'notes',
  'responsible_department',
].join(',')

function buildFilters(query: SearchQuery): string {
  const filters: string[] = []
  if (query.artist) filters.push(`[creator:${query.artist}]`)
  if (query.publicDomainOnly) filters.push('[public_domain:true]')
  if (query.hasImageOnly) filters.push('[has_image:true]')
  if (query.yearStart != null && query.yearEnd != null) {
    filters.push(`[production_dates_period:${query.yearStart}-${query.yearEnd}]`)
  }
  return filters.join(',')
}

function extractCorrections(
  corrections: Record<string, string[]> | undefined,
  queryText: string,
): string[] {
  if (!corrections) return []
  const lower = queryText.trim().toLowerCase()
  return corrections[lower] ?? Object.values(corrections)[0] ?? []
}

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  const params = new URLSearchParams({
    keys: query.text.trim() || '*',
    rows: String(query.pageSize),
    offset: String(query.page * query.pageSize),
    fields: FIELDS,
  })
  const filterString = buildFilters(query)
  if (filterString) params.set('filters', filterString)

  const res = await fetch(`${API_BASE}/art/search/?${params}`, { signal })
  if (!res.ok) throw new Error(`SMK search failed: ${res.status} ${res.statusText}`)

  const data: SmkSearchResponse = await res.json()
  const items = (data.items ?? []).map(smkToArtwork)
  return {
    items,
    total: data.found ?? items.length,
    hasMore: query.page * query.pageSize + items.length < (data.found ?? 0),
    corrections: extractCorrections(data.corrections, query.text),
  }
}

async function getSimilar(work: Artwork, signal?: AbortSignal): Promise<Artwork[]> {
  if (!work.similarUrl) return []
  const res = await fetch(work.similarUrl, { signal })
  if (!res.ok) throw new Error(`SMK similar lookup failed: ${res.status} ${res.statusText}`)

  const data: { items?: SmkArtwork[] } = await res.json()
  return (data.items ?? []).map(smkToArtwork)
}

export const smkProvider: ArtProvider = {
  id: 'smk',
  label: 'SMK — National Gallery of Denmark',
  shortLabel: 'SMK',
  capabilities: {
    supportsArtistFilter: true,
    supportsPeriodFilter: true,
    supportsPublicDomainFilter: true,
    supportsHasImageFilter: true,
    supportsSimilar: true,
    supportsCorrections: true,
    needsApiKey: false,
    maxPageSize: 100,
  },
  domains: ['api.smk.dk', 'iip-thumb.smk.dk', 'iip.smk.dk', 'similar.api.smk.dk'],
  search,
  getSimilar,
}
