import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { ResultGrid } from './components/ResultGrid'
import { StateMessage } from './components/StateMessage'
import { DetailPanel } from './components/DetailPanel'
import { useSearch } from './hooks/useSearch'
import { useInsertImage } from './hooks/useInsertImage'
import { DEFAULT_FILTERS, type Filters, type InsertSize } from './types'
import type { Artwork } from './api/smkClient'

export function App() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null)

  const search = useSearch(query, filters)
  const insert = useInsertImage()

  const handleInsertFromGrid = (work: Artwork) =>
    insert.insertArtwork(work, { size: 'medium', withCaption: false })

  const handleInsertFromDetail = (size: InsertSize, withCaption: boolean) => {
    if (!selectedWork) return
    insert.insertArtwork(selectedWork, { size, withCaption })
  }

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
            onInsert={handleInsertFromGrid}
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

      {selectedWork && (
        <DetailPanel
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
          onInsert={handleInsertFromDetail}
          inserting={insert.inserting === selectedWork.object_number}
          isFavorite={false}
        />
      )}
    </main>
  )
}
