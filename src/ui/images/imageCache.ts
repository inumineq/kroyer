import { fetchImageViaPlugin } from './pluginFetch'

/**
 * url -> blob: object URL cache for main-thread-fetched images (AIC), backed
 * by an LRU eviction policy. The cache owns every object URL it creates and
 * only revokes one on eviction — never on caller unmount — since the same
 * URL is likely to be requested again while scrolling a result grid.
 */
const MAX_ENTRIES = 48

const cache = new Map<string, string>() // url -> objectUrl, insertion order = recency
const inflight = new Map<string, Promise<string>>()

function touch(url: string) {
  const objectUrl = cache.get(url)
  if (objectUrl === undefined) return
  // Re-insert to move this entry to the most-recently-used end.
  cache.delete(url)
  cache.set(url, objectUrl)
}

function evictIfNeeded() {
  while (cache.size > MAX_ENTRIES) {
    const oldestUrl = cache.keys().next().value
    if (oldestUrl === undefined) break
    const objectUrl = cache.get(oldestUrl)
    cache.delete(oldestUrl)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Resolves `url` to a cached `blob:` object URL, fetching it through the
 * plugin main thread on a cache miss. Concurrent callers for the same url
 * share one in-flight fetch. Rejects (does not cache) on fetch failure or
 * abort.
 */
export async function getCachedImageUrl(url: string, signal?: AbortSignal): Promise<string> {
  const cached = cache.get(url)
  if (cached !== undefined) {
    touch(url)
    return cached
  }

  const existing = inflight.get(url)
  if (existing) return existing

  const promise = fetchImageViaPlugin(url, signal)
    .then((bytes) => {
      const objectUrl = URL.createObjectURL(new Blob([bytes]))
      cache.set(url, objectUrl)
      evictIfNeeded()
      return objectUrl
    })
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, promise)
  return promise
}
