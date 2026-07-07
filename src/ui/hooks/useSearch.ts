import { useCallback, useEffect, useRef, useState } from 'react'
import type { Artwork } from '../../shared/model'
import type { ArtProvider, SearchQuery } from '../providers/types'
import { postToPlugin } from '../messages'
import type { Filters } from '../types'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 30

export type SearchState = {
  query: string
  filters: Filters
  results: Artwork[]
  found: number
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  corrections: string[]
  hasSearched: boolean
  loadMore: () => void
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useSearch(provider: ArtProvider, query: string, filters: Filters): SearchState {
  const [results, setResults] = useState<Artwork[]>([])
  const [found, setFound] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corrections, setCorrections] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const pageRef = useRef(0)
  const activeQueryKeyRef = useRef<string | null>(null)

  // A creator filter only exists for providers that support it — otherwise a
  // value left over from another provider would silently constrain results.
  const creator = provider.capabilities.supportsArtistFilter ? filters.creator : undefined

  const buildQuery = useCallback(
    (page: number): SearchQuery => ({
      text: query.trim(),
      artist: creator,
      yearStart: filters.periodStart,
      yearEnd: filters.periodEnd,
      publicDomainOnly: filters.publicDomainOnly,
      hasImageOnly: filters.hasImage,
      page,
      pageSize: Math.min(PAGE_SIZE, provider.capabilities.maxPageSize),
    }),
    [
      provider,
      query,
      creator,
      filters.periodStart,
      filters.periodEnd,
      filters.publicDomainOnly,
      filters.hasImage,
    ],
  )

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed && !creator) {
      abortRef.current?.abort()
      pageRef.current = 0
      activeQueryKeyRef.current = null
      setResults([])
      setFound(0)
      setHasMore(false)
      setError(null)
      setCorrections([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      pageRef.current = 0

      setLoading(true)
      setLoadingMore(false)
      setError(null)
      try {
        const baseQuery = buildQuery(0)
        const page = await provider.search(baseQuery, controller.signal)
        if (controller.signal.aborted) return

        activeQueryKeyRef.current = `${provider.id}:${JSON.stringify(baseQuery)}`
        setResults(page.items)
        setFound(page.total)
        setHasMore(page.hasMore)
        setCorrections(page.corrections ?? [])
        setHasSearched(true)
      } catch (err) {
        if (controller.signal.aborted || isAbort(err)) return
        const message = err instanceof Error ? err.message : 'Search failed'
        setError(message)
        setResults([])
        setFound(0)
        setHasMore(false)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [provider, buildQuery, query, creator])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    // During the debounce after a query/provider change the displayed results
    // belong to the previous query — ignore clicks until the new base search
    // has landed.
    if (activeQueryKeyRef.current !== `${provider.id}:${JSON.stringify(buildQuery(0))}`) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const nextPage = pageRef.current + 1

    setLoadingMore(true)
    try {
      const page = await provider.search(buildQuery(nextPage), controller.signal)
      if (controller.signal.aborted) return

      pageRef.current = nextPage
      setResults((prev) => {
        const seen = new Set(prev.map((w) => w.key))
        return [...prev, ...page.items.filter((w) => !seen.has(w.key))]
      })
      setHasMore(page.hasMore)
    } catch (err) {
      if (controller.signal.aborted || isAbort(err)) return
      // Keep the results we have; a toast beats blanking the grid
      postToPlugin({
        type: 'notify',
        message: err instanceof Error ? err.message : 'Could not load more results',
        error: true,
      })
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
    }
  }, [provider, buildQuery, loading, loadingMore, hasMore])

  return {
    query,
    filters,
    results,
    found,
    loading,
    loadingMore,
    hasMore,
    error,
    corrections,
    hasSearched,
    loadMore,
  }
}
