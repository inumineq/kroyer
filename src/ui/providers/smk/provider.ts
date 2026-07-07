import type { Artwork } from '../../../shared/model'
import { fetchJson, offsetHasMore } from '../shared'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { smkToArtwork } from './mapper'
import type { SmkArtwork, SmkSearchResponse } from './types'

const API_BASE = 'https://api.smk.dk/api/v1'

/**
 * Only request the fields the UI actually uses — the default payload is much
 * larger. Validated against the live endpoint (2026-07-07): every field below
 * returns 200 individually.
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
  // NOT frontend_url: requesting it makes the API 500 ("No such list field:
  // frontend_url_da"); the mapper derives it from object_number instead.
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

  let data = await fetchJson<SmkSearchResponse>(
    'SMK search',
    `${API_BASE}/art/search/?${params}`,
    signal,
  )

  // Safety net for the unvalidated fields= param: if the response items are
  // unusable (no object_number anywhere), retry once with the full payload.
  const rawItems = data.items ?? []
  if (rawItems.length > 0 && rawItems.every((item) => !item.object_number)) {
    params.delete('fields')
    data = await fetchJson<SmkSearchResponse>(
      'SMK search',
      `${API_BASE}/art/search/?${params}`,
      signal,
    )
  }

  const items = (data.items ?? []).map(smkToArtwork)
  return {
    items,
    total: data.found ?? items.length,
    hasMore: offsetHasMore(query.page, query.pageSize, items.length, data.found ?? 0),
    corrections: extractCorrections(data.corrections, query.text),
  }
}

async function getSimilar(work: Artwork, signal?: AbortSignal): Promise<Artwork[]> {
  if (!work.similarUrl) return []
  const data = await fetchJson<{ items?: SmkArtwork[] }>(
    'SMK similar lookup',
    work.similarUrl,
    signal,
  )
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
    needsApiKey: false,
    maxPageSize: 100,
  },
  domains: ['api.smk.dk', 'iip-thumb.smk.dk', 'iip.smk.dk', 'similar.api.smk.dk'],
  imageLoading: 'iframe',
  search,
  getSimilar,
}
