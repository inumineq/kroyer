import { useState } from 'react'
import { searchArtworks, type Artwork } from './api/smkClient'

export function App() {
  const [query, setQuery] = useState('')
  const [publicDomainOnly, setPublicDomainOnly] = useState(true)
  const [results, setResults] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    try {
      const { items } = await searchArtworks({
        keys: query,
        publicDomainOnly,
        hasImage: true,
        rows: 30,
      })
      setResults(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">SMK Open</h1>
        <p className="app__subtitle">Search artworks from Statens Museum for Kunst</p>
      </header>

      <form className="search" onSubmit={handleSearch}>
        <input
          type="search"
          className="search__input"
          placeholder="Search artist, title, period…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="search__submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={publicDomainOnly}
          onChange={(e) => setPublicDomainOnly(e.target.checked)}
        />
        <span>Public domain only</span>
      </label>

      {error && <p className="error">{error}</p>}

      {!loading && !error && results.length === 0 && query && (
        <p className="empty">No results. Try a different search.</p>
      )}

      <ul className="results">
        {results.map((work) => (
          <li key={work.object_number} className="result-card">
            {work.image_thumbnail && (
              <img
                src={work.image_thumbnail}
                alt={work.titles?.[0]?.title ?? 'Untitled'}
                className="result-card__image"
                loading="lazy"
              />
            )}
            <div className="result-card__meta">
              <p className="result-card__title">{work.titles?.[0]?.title ?? 'Untitled'}</p>
              <p className="result-card__artist">{work.artist?.[0] ?? 'Unknown artist'}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
