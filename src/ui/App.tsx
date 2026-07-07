import { useEffect, useRef, useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { FilterPanel } from './components/FilterPanel'
import { ResultGrid } from './components/ResultGrid'
import { StateMessage } from './components/StateMessage'
import { DetailPanel } from './components/DetailPanel'
import { TabBar } from './components/TabBar'
import { SearchHistory } from './components/SearchHistory'
import { CollectionsTab } from './components/CollectionsTab'
import { ResizeHandle } from './components/ResizeHandle'
import { useSearch } from './hooks/useSearch'
import { useInsertImage } from './hooks/useInsertImage'
import { postToPlugin } from './messages'
import { fetchImageWithDimensions } from './utils/images'
import { imageUrlFor } from './images/sizing'
import { getProvider, DEFAULT_PROVIDER_ID } from './providers/registry'
import { COLLECTIONS_V2_KEY, loadCollections, makeEnvelope } from './storage/migrate'
import { quotaStatus } from './storage/quota'
import {
  DEFAULT_FILTERS,
  type Filters,
  type InsertSize,
  type Tab,
  type Collection,
} from './types'
import type { Artwork } from '../shared/model'
import {
  ensureDefaultCollection,
  favoriteIdsFor,
  toggleWorkIn,
  removeWorkFrom,
  updateSearchHistory,
  makeCollection,
  renameCollection,
  deleteCollection,
} from './utils/collections'

export function App() {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null)

  const [history, setHistory] = useState<string[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [initialized, setInitialized] = useState(false)

  const [exportingMoodBoard, setExportingMoodBoard] = useState<{ name: string; progress: number; total: number } | null>(null)

  const provider = getProvider(DEFAULT_PROVIDER_ID)
  const search = useSearch(provider, query, filters)
  const insert = useInsertImage()

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const msg = e.data?.pluginMessage
      if (msg?.type === 'init') {
        setHistory(msg.history ?? [])
        setCollections(ensureDefaultCollection(loadCollections(msg.collectionsV2, msg.collections)))
        setInitialized(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!initialized) return
    postToPlugin({ type: 'storage-set', key: 'history', value: history })
  }, [history, initialized])

  const quotaWarned = useRef(false)
  useEffect(() => {
    if (!initialized) return
    const envelope = makeEnvelope(collections)
    postToPlugin({ type: 'storage-set', key: COLLECTIONS_V2_KEY, value: envelope })

    const status = quotaStatus(envelope)
    if (status !== 'ok' && !quotaWarned.current) {
      quotaWarned.current = true
      postToPlugin({
        type: 'notify',
        message: 'Collection storage is nearly full — consider removing some works',
        error: true,
      })
    } else if (status === 'ok') {
      quotaWarned.current = false
    }
  }, [collections, initialized])

  const defaultCollection = collections[0]
  const favoriteIds = favoriteIdsFor(defaultCollection)

  function handleSubmit() {
    if (!query.trim()) return
    setHistory((prev) => updateSearchHistory(prev, query))
  }

  function handleInsertFromGrid(work: Artwork) {
    insert.insertArtwork(work, { size: 'medium', withCaption: false })
  }

  function handleInsertFromDetail(size: InsertSize, withCaption: boolean) {
    if (!selectedWork) return
    insert.insertArtwork(selectedWork, { size, withCaption })
  }

  function handleToggleFavorite(work: Artwork) {
    if (!defaultCollection) return
    const isAdd = !favoriteIds.has(work.key)
    if (isAdd && quotaStatus(makeEnvelope(collections)) === 'full') {
      postToPlugin({
        type: 'notify',
        message: 'Collection storage is full — remove some works before adding more',
        error: true,
      })
      return
    }
    setCollections((prev) => toggleWorkIn(prev, defaultCollection.id, work))
  }

  function handleCreateCollection(name: string) {
    setCollections((prev) => [...prev, makeCollection(name)])
  }

  function handleRenameCollection(id: string, name: string) {
    setCollections((prev) => renameCollection(prev, id, name))
  }

  function handleDeleteCollection(id: string) {
    setCollections((prev) => ensureDefaultCollection(deleteCollection(prev, id)))
  }

  function handleRemoveFromCollection(collectionId: string, workKey: string) {
    setCollections((prev) => removeWorkFrom(prev, collectionId, workKey))
  }

  async function handleExportMoodBoard(collection: Collection) {
    const eligible = collection.works.filter((w) => w.image.thumbnailUrl)
    if (eligible.length === 0) {
      postToPlugin({ type: 'notify', message: 'No images in this collection to export', error: true })
      return
    }

    setExportingMoodBoard({ name: collection.name, progress: 0, total: eligible.length })

    const items = []
    for (const work of eligible) {
      const url = imageUrlFor(work, 'medium')
      if (!url) continue
      try {
        const { bytes, width, height } = await fetchImageWithDimensions(url)
        items.push({
          imageBytes: bytes,
          width,
          height,
          title: work.title,
          artist: work.artist,
        })
      } catch {
        // Skip individual failures, keep going
      }
      setExportingMoodBoard((prev) =>
        prev ? { ...prev, progress: prev.progress + 1 } : null,
      )
    }

    if (items.length > 0) {
      postToPlugin({ type: 'create-mood-board', items, title: collection.name })
    } else {
      postToPlugin({ type: 'notify', message: 'Could not fetch any images', error: true })
    }
    setExportingMoodBoard(null)
  }

  const showFilterCount = search.hasSearched && !search.loading && !search.error
  const showFirstLoad = !search.hasSearched && !query && history.length === 0
  const showHistory = !search.hasSearched && !query && history.length > 0
  const showNoResults =
    search.hasSearched && !search.loading && !search.error && search.results.length === 0
  const showError = !!search.error
  const showResults = search.results.length > 0

  return (
    <main className="app">
      <TabBar
        tab={tab}
        onChange={setTab}
        collectionCount={collections.reduce((sum, c) => sum + c.works.length, 0)}
      />

      {tab === 'search' && (
        <>
          <header className="app__header">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              loading={search.loading}
            />
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              resultCount={showFilterCount ? search.found : undefined}
            />
          </header>

          <section className="app__body">
            {showFirstLoad && <StateMessage variant="first-load" />}

            {showHistory && (
              <SearchHistory
                history={history}
                onSelect={(q) => setQuery(q)}
                onClear={() => setHistory([])}
              />
            )}

            {showError && (
              <StateMessage
                variant="error"
                message={search.error ?? undefined}
                hint={`The ${provider.shortLabel} API might be down. Wait a moment and try again.`}
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
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </section>
        </>
      )}

      {tab === 'collections' && (
        <CollectionsTab
          collections={collections}
          onCreate={handleCreateCollection}
          onRename={handleRenameCollection}
          onDelete={handleDeleteCollection}
          onRemoveWork={handleRemoveFromCollection}
          onSelectWork={setSelectedWork}
          onInsertWork={handleInsertFromGrid}
          onExportMoodBoard={handleExportMoodBoard}
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

      {exportingMoodBoard && (
        <div className="overlay" role="status" aria-live="polite">
          <div className="overlay__panel">
            <div className="overlay__spinner" />
            <p className="overlay__title">Building mood board…</p>
            <p className="overlay__hint">
              {exportingMoodBoard.progress} / {exportingMoodBoard.total}
            </p>
          </div>
        </div>
      )}

      {selectedWork && (
        <DetailPanel
          key={selectedWork.key}
          work={selectedWork}
          onClose={() => setSelectedWork(null)}
          onInsert={handleInsertFromDetail}
          onSelectRelated={setSelectedWork}
          inserting={insert.inserting === selectedWork.key}
          isFavorite={favoriteIds.has(selectedWork.key)}
          onToggleFavorite={() => handleToggleFavorite(selectedWork)}
        />
      )}

      <ResizeHandle />
    </main>
  )
}
