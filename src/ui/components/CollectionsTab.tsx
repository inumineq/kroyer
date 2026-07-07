import { useState } from 'react'
import type { Artwork, Collection } from '../../shared/model'
import { ResultGrid } from './ResultGrid'
import { StateMessage } from './StateMessage'

type Props = {
  collections: Collection[]
  onCreate: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onRemoveWork: (collectionId: string, workKey: string) => void
  onSelectWork: (work: Artwork) => void
  onInsertWork: (work: Artwork) => void
  onExportMoodBoard?: (collection: Collection) => void
  insertingId: string | null
}

export function CollectionsTab(props: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const activeCollection = activeId ? props.collections.find((c) => c.id === activeId) : null

  if (activeCollection) {
    return (
      <CollectionView
        collection={activeCollection}
        onBack={() => setActiveId(null)}
        onRename={(name) => props.onRename(activeCollection.id, name)}
        onDelete={() => {
          props.onDelete(activeCollection.id)
          setActiveId(null)
        }}
        onRemoveWork={(workKey) => props.onRemoveWork(activeCollection.id, workKey)}
        onSelectWork={props.onSelectWork}
        onInsertWork={props.onInsertWork}
        onExportMoodBoard={
          props.onExportMoodBoard
            ? () => props.onExportMoodBoard!(activeCollection)
            : undefined
        }
        insertingId={props.insertingId}
      />
    )
  }

  return (
    <div className="collections">
      <div className="collections__header">
        <h2 className="collections__heading">Collections</h2>
        <button
          type="button"
          className="collections__new"
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          + New
        </button>
      </div>

      {creating && (
        <CreateForm
          onCreate={(name) => {
            props.onCreate(name)
            setCreating(false)
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {props.collections.length === 0 && !creating && (
        <StateMessage
          variant="empty"
          message="No collections yet"
          hint="Star a work in search results to save it. Stars go to the first collection in this list."
        />
      )}

      <ul className="collections__list">
        {props.collections.map((c, i) => (
          <CollectionListItem
            key={c.id}
            collection={c}
            isDefault={i === 0}
            onOpen={() => setActiveId(c.id)}
          />
        ))}
      </ul>
    </div>
  )
}

type CollectionListItemProps = {
  collection: Collection
  isDefault: boolean
  onOpen: () => void
}

function CollectionListItem({ collection, isDefault, onOpen }: CollectionListItemProps) {
  const preview = collection.works.slice(0, 3)
  return (
    <li className="collection-item">
      <button type="button" className="collection-item__button" onClick={onOpen}>
        <div className="collection-item__previews">
          {preview.length === 0 ? (
            <div className="collection-item__empty" aria-hidden="true">
              ∅
            </div>
          ) : (
            preview.map((w) => (
              <div key={w.key} className="collection-item__thumb">
                {w.image.thumbnailUrl && (
                  <img src={w.image.thumbnailUrl} alt="" loading="lazy" />
                )}
              </div>
            ))
          )}
        </div>
        <div className="collection-item__meta">
          <div className="collection-item__name">
            <span>{collection.name}</span>
            {isDefault && <span className="collection-item__badge">Default</span>}
          </div>
          <p className="collection-item__count">
            {collection.works.length} {collection.works.length === 1 ? 'work' : 'works'}
          </p>
        </div>
        <span className="collection-item__chevron" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  )
}

type CreateFormProps = {
  onCreate: (name: string) => void
  onCancel: () => void
}

function CreateForm({ onCreate, onCancel }: CreateFormProps) {
  const [name, setName] = useState('')

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
  }

  return (
    <form
      className="collection-create"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        type="text"
        className="collection-create__input"
        placeholder="Collection name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <button type="submit" className="collection-create__submit" disabled={!name.trim()}>
        Create
      </button>
      <button type="button" className="collection-create__cancel" onClick={onCancel}>
        Cancel
      </button>
    </form>
  )
}

type CollectionViewProps = {
  collection: Collection
  onBack: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onRemoveWork: (workKey: string) => void
  onSelectWork: (work: Artwork) => void
  onInsertWork: (work: Artwork) => void
  onExportMoodBoard?: () => void
  insertingId: string | null
}

function CollectionView({
  collection,
  onBack,
  onRename,
  onDelete,
  onRemoveWork,
  onSelectWork,
  onInsertWork,
  onExportMoodBoard,
  insertingId,
}: CollectionViewProps) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(collection.name)
  const [menuOpen, setMenuOpen] = useState(false)

  const favoriteIds = new Set(collection.works.map((w) => w.key))

  return (
    <div className="collection-view">
      <header className="collection-view__header">
        <button type="button" className="collection-view__back" onClick={onBack}>
          ‹ Collections
        </button>
        <div className="collection-view__menu-wrap">
          <button
            type="button"
            className="collection-view__menu-trigger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Collection options"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setRenaming(true)
                  setMenuOpen(false)
                }}
              >
                Rename
              </button>
              {onExportMoodBoard && collection.works.length > 0 && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExportMoodBoard()
                    setMenuOpen(false)
                  }}
                >
                  Export as mood board
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="menu__danger"
                onClick={() => {
                  if (confirm(`Delete "${collection.name}"? Works in it will be removed.`)) {
                    onDelete()
                  } else {
                    setMenuOpen(false)
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="collection-view__title-row">
        {renaming ? (
          <form
            className="collection-view__rename"
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = name.trim()
              if (trimmed && trimmed !== collection.name) onRename(trimmed)
              setRenaming(false)
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onBlur={() => {
                setRenaming(false)
                setName(collection.name)
              }}
            />
          </form>
        ) : (
          <h2 className="collection-view__title">{collection.name}</h2>
        )}
        <p className="collection-view__count">
          {collection.works.length} {collection.works.length === 1 ? 'work' : 'works'}
        </p>
      </div>

      <div className="collection-view__body">
        {collection.works.length === 0 ? (
          <StateMessage
            variant="empty"
            message="Empty collection"
            hint="Star works in search results to add them here."
          />
        ) : (
          <ResultGrid
            results={collection.works}
            onSelect={onSelectWork}
            onInsert={onInsertWork}
            insertingId={insertingId}
            favoriteIds={favoriteIds}
            onToggleFavorite={(work) => onRemoveWork(work.key)}
          />
        )}
      </div>
    </div>
  )
}
