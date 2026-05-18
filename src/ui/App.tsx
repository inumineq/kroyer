import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { ResultGrid } from './components/ResultGrid'
import { StateMessage } from './components/StateMessage'
import { useSearch } from './hooks/useSearch'
import { useInsertImage } from './hooks/useInsertImage'
import { DEFAULT_FILTERS, type Filters } from './types'
import type { Artwork } from './api/smkClient'

export function App() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [, setSelectedWork] = useState<Artwork | null>(null)

  const search = useSearch(query, filters)
  const insert = useInsertImage()

  const showFilterCount = search.hasSearched && !search.loading && !search.error
  const showFirstLoad = !search.hasSearched && !query
  const showNoResults =
    search.hasSearched && !search.loading && !search.error && search.results.length === 0
  const showError = !!search.error
  const showResults = search.results.length > 0

  return (
    <main className="app">
      <header className="app__header">
        <SearchBar value={query} onChange={setQuery} loading={search.loading} />
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          resultCount={showFilterCount ? search.found : undefined}
        />
      </header>

      <section className="app__body">
        {showFirstLoad && <StateMessage variant="first-load" />}

        {showError && (
          <StateMessage
            variant="error"
            message={search.error ?? undefined}
            hint="The SMK API might be down. Wait a moment and try again."
          />
        )}

        {showNoResults && (
          <StateMessage
            variant="no-results"
            corrections={search.corrections}
            onCorrectionClick={(c) => setQuery(c)}
          />
        )}

        {showResults && (
          <ResultGrid
            results={search.results}
            onSelect={setSelectedWork}
            onInsert={(work) => insert.insertArtwork(work, { size: 'medium', withCaption: false })}
            insertingId={insert.inserting}
          />
        )}

        {insert.insertError && (
          <div className="app__toast app__toast--error" role="alert">
            {insert.insertError}
            <button type="button" onClick={insert.clearError}>
              ×
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
