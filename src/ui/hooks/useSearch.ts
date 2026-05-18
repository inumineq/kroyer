import { useEffect, useRef, useState } from 'react'
import { searchArtworks, type Artwork, type SearchResult } from '../api/smkClient'
import type { Filters } from '../types'

const DEBOUNCE_MS = 300

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

export function useSearch(query: string, filters: Filters): SearchState {
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

      setLoading(true)
      setError(null)
      try {
        const result: SearchResult = await searchArtworks({
          keys: trimmed || '*',
          creator: filters.creator,
          periodStart: filters.periodStart,
          periodEnd: filters.periodEnd,
          publicDomainOnly: filters.publicDomainOnly,
          hasImage: filters.hasImage,
          rows: 30,
        })
        if (controller.signal.aborted) return

        setResults(result.items)
        setFound(result.found)
        setCorrections(extractCorrections(result.corrections, trimmed))
        setHasSearched(true)
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Search failed'
        setError(message)
        setResults([])
        setFound(0)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, filters.creator, filters.periodStart, filters.periodEnd, filters.publicDomainOnly, filters.hasImage])

  return { query, filters, results, found, loading, error, corrections, hasSearched }
}

function extractCorrections(
  corrections: Record<string, string[]> | undefined,
  query: string,
): string[] {
  if (!corrections) return []
  const lower = query.toLowerCase()
  return corrections[lower] ?? Object.values(corrections)[0] ?? []
}
