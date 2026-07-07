import type { Artwork } from '../../../shared/model'
import { mapWithConcurrency } from '../../utils/async'
import { fetchJson } from '../shared'
import type { ArtProvider, SearchPage, SearchQuery } from '../types'
import { rijksToArtwork } from './mapper'
import type { RijksEdmRecord, RijksSearchResponse } from './types'

const SEARCH_BASE = 'https://data.rijksmuseum.nl/search/collection'
const DATA_BASE = 'https://data.rijksmuseum.nl'

/**
 * Like The Met, search returns bare identifiers and each page hydrates N
 * objects individually — cache both the merged ID universe and the hydrated
 * objects. Concurrency stays below The Met's 8: data.rijksmuseum.nl's rate
 * limits are unpublished, so be polite.
 */
const HYDRATE_CONCURRENCY = 6
const ID_CACHE_MAX = 20
const OBJECT_CACHE_MAX = 600

const idCache = new Map<string, string[]>()
const objectCache = new Map<string, Artwork | null>()

function cachePut<K, V>(cache: Map<K, V>, key: K, value: V, max: number) {
  if (!cache.has(key) && cache.size >= max) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

/** Get with LRU touch: re-insert so hot entries survive eviction. */
function cacheGet<K, V>(cache: Map<K, V>, key: K): V | undefined {
  if (!cache.has(key)) return undefined
  const value = cache.get(key) as V
  cache.delete(key)
  cache.set(key, value)
  return value
}

/**
 * The API has no free-text param (unknown params 400), so free text fans out
 * to parallel field searches: title, creator, description. When the artist
 * filter is set it rides along as `creator=` on every stream — and the
 * text→creator stream is dropped, since the creator param can't hold both
 * values. Empty text collapses to a single browse stream. Every stream
 * carries `imageAvailable=true` (The Met precedent: images-only corpus).
 */
export function buildStreamParams(text: string, artist?: string): URLSearchParams[] {
  const streams: URLSearchParams[] = []
  const withCommon = (params: URLSearchParams) => {
    if (artist) params.set('creator', artist)
    params.set('imageAvailable', 'true')
    return params
  }

  if (text) {
    streams.push(withCommon(new URLSearchParams({ title: text })))
    if (!artist) streams.push(withCommon(new URLSearchParams({ creator: text })))
    streams.push(withCommon(new URLSearchParams({ description: text })))
  } else {
    streams.push(withCommon(new URLSearchParams()))
  }
  return streams
}

/** Merge ID streams in order, deduplicating on first occurrence. */
export function mergeIdStreams(streams: string[][]): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const stream of streams) {
    for (const id of stream) {
      if (seen.has(id)) continue
      seen.add(id)
      merged.push(id)
    }
  }
  return merged
}

/** `https://id.rijksmuseum.nl/200105339` → `200105339` (the hydratable id). */
function numericId(uri: string): string {
  return uri.slice(uri.lastIndexOf('/') + 1)
}

async function fetchObject(id: string, signal: AbortSignal): Promise<Artwork | null> {
  const cached = cacheGet(objectCache, id)
  if (cached !== undefined) return cached

  // The EDM-framed profile returns everything the UI needs in one call.
  const res = await fetch(
    `${DATA_BASE}/${id}?_profile=edm-framed&_media_type=application/ld+json`,
    { signal },
  )
  if (!res.ok) {
    // Only a definitive 404 is worth remembering; transient failures
    // (429 rate limits, 5xx) must stay retryable.
    if (res.status === 404) cachePut(objectCache, id, null, OBJECT_CACHE_MAX)
    return null
  }
  const raw: RijksEdmRecord = await res.json()
  const work = rijksToArtwork(raw, id)
  cachePut(objectCache, id, work, OBJECT_CACHE_MAX)
  return work
}

async function search(query: SearchQuery, signal: AbortSignal): Promise<SearchPage> {
  const streams = buildStreamParams(query.text.trim(), query.artist)
  const cacheKey = streams.map((p) => p.toString()).join('|')

  let ids = cacheGet(idCache, cacheKey)
  if (!ids) {
    // V1 takes the first page (100 ids) of each stream — ≤300 unique works
    // per query. pageToken continuation is the documented later extension.
    const results = await Promise.all(
      streams.map((params) =>
        fetchJson<RijksSearchResponse>('Rijksmuseum search', `${SEARCH_BASE}?${params}`, signal),
      ),
    )
    ids = mergeIdStreams(
      results.map((r) => (r.orderedItems ?? []).map((item) => numericId(item.id))),
    )
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
    // The universe length, not the API's totalItems: it's what V1 can
    // actually reach, so hasMore stays honest at the cap.
    total: ids.length,
    hasMore: start + slice.length < ids.length,
  }
}

export const rijksProvider: ArtProvider = {
  id: 'rijks',
  label: 'Rijksmuseum — Amsterdam',
  shortLabel: 'Rijksmuseum',
  capabilities: {
    supportsArtistFilter: true,
    // creationDate is wildcard-match, not a range — a later extension.
    supportsPeriodFilter: false,
    // The API cannot filter by rights, so the toggle is hidden.
    supportsPublicDomainFilter: false,
    // imageAvailable=true is always sent (The Met precedent).
    supportsHasImageFilter: false,
    needsApiKey: false,
    maxPageSize: 50,
  },
  domains: ['data.rijksmuseum.nl', 'iiif.micr.io'],
  imageLoading: 'iframe',
  search,
}
