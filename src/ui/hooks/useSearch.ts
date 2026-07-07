import { useEffect, useRef, useState } from 'react'
import type { Artwork } from '../../shared/model'
import type { ArtProvider, SearchQuery } from '../providers/types'
import type { Filters } from '../types'

const DEBOUNCE_MS = 300
const PAGE_SIZE = 30

export type SearchState = {
  query: string
  filters: Filters
  results: Artwork[]
  found: number
  loading: boolean
  error: string | null
  corrections: string[]
  hasSearched: boolean
}

export function useSearch(provider: ArtProvider, query: string, filters: Filters): SearchState {
  const [results, setResults] = useState<Artwork[]>([])
  const [found, setFound] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corrections, setCorrections] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed && !filters.creator) {
      abortRef.current?.abort()
      setResults([])
      setFound(0)
      setError(null)
      setCorrections([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const searchQuery: SearchQuery = {
        text: trimmed,
        artist: filters.creator,
        yearStart: filters.periodStart,
        yearEnd: filters.periodEnd,
        publicDomainOnly: filters.publicDomainOnly,
        hasImageOnly: filters.hasImage,
        page: 0,
        pageSize: PAGE_SIZE,
      }

      setLoading(true)
      setError(null)
      try {
        const page = await provider.search(searchQuery, controller.signal)
        if (controller.signal.aborted) return

        setResults(page.items)
        setFound(page.total)
        setCorrections(page.corrections ?? [])
        setHasSearched(true)
      } catch (err) {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Search failed'
        setError(message)
        setResults([])
        setFound(0)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [
    provider,
    query,
    filters.creator,
    filters.periodStart,
    filters.periodEnd,
    filters.publicDomainOnly,
    filters.hasImage,
  ])

  return { query, filters, results, found, loading, error, corrections, hasSearched }
}
