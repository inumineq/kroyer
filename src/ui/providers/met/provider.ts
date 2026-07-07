import type { Artwork } from '../../../shared/model'
import { mapWithConcurrency } from '../../utils/async'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { metToArtwork } from './mapper'
import type { MetObject, MetSearchResponse } from './types'

const API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1'

/**
 * The Met's search endpoint returns bare object IDs; each page requires
 * hydrating N objects individually. Keep the fan-out polite and cache both
 * the ID lists and hydrated objects so load-more and re-searches are cheap.
 */
const HYDRATE_CONCURRENCY = 8
const ID_CACHE_MAX = 20
const OBJECT_CACHE_MAX = 600

const idCache = new Map<string, number[]>()
const objectCache = new Map<number, Artwork | null>()

function cachePut<K, V>(cache: Map<K, V>, key: K, value: V, max: number) {
  if (cache.size >= max) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

async function fetchObject(id: number, signal: AbortSignal): Promise<Artwork | null> {
  const cached = objectCache.get(id)
  if (cached !== undefined) return cached

  const res = await fetch(`${API_BASE}/objects/${id}`, { signal })
  if (!res.ok) {
    // Individual objects 404 occasionally; skip rather than fail the page
    if (!signal.aborted) cachePut(objectCache, id, null, OBJECT_CACHE_MAX)
    return null
  }
  const raw: MetObject = await res.json()
  const work = metToArtwork(raw)
  cachePut(objectCache, id, work, OBJECT_CACHE_MAX)
  return work
}

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  // No dedicated artist filter — fold the artist into the full-text query.
  const text = [query.text.trim(), query.artist?.trim()].filter(Boolean).join(' ')

  const params = new URLSearchParams({ q: text, hasImages: 'true' })
  if (query.yearStart != null && query.yearEnd != null) {
    params.set('dateBegin', String(query.yearStart))
    params.set('dateEnd', String(query.yearEnd))
  }

  const cacheKey = params.toString()
  let ids = idCache.get(cacheKey)
  if (!ids) {
    const res = await fetch(`${API_BASE}/search?${params}`, { signal })
    if (!res.ok) throw new Error(`The Met search failed: ${res.status}`)
    const data: MetSearchResponse = await res.json()
    ids = data.objectIDs ?? []
    cachePut(idCache, cacheKey, ids, ID_CACHE_MAX)
  }

  const start = query.page * query.pageSize
  const slice = ids.slice(start, start + query.pageSize)
  const hydrated = await mapWithConcurrency(slice, HYDRATE_CONCURRENCY, (id) =>
    fetchObject(id, signal),
  )
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

  return {
    items: hydrated.filter((w): w is Artwork => w !== null),
    total: ids.length,
    hasMore: start + slice.length < ids.length,
  }
}

export const metProvider: ArtProvider = {
  id: 'met',
  label: 'The Metropolitan Museum of Art',
  shortLabel: 'The Met',
  capabilities: {
    supportsArtistFilter: false,
    supportsPeriodFilter: true,
    // hasImages=true is always sent, and The Met only serves images for
    // public-domain works — the visible corpus is PD by construction.
    supportsPublicDomainFilter: false,
    supportsHasImageFilter: false,
    supportsSimilar: false,
    supportsCorrections: false,
    needsApiKey: false,
    maxPageSize: 50,
  },
  domains: ['collectionapi.metmuseum.org', 'images.metmuseum.org'],
  search,
}
