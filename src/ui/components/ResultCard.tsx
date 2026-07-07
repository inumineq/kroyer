import { useState } from 'react'
import type { Artwork } from '../../shared/model'
import { hasDisplayableImage, isFreelyUsable } from '../../shared/model'
import { getProvider } from '../providers/registry'

type Props = {
  work: Artwork
  onSelect: () => void
  onInsert: () => void
  inserting: boolean
  isFavorite: boolean
  onToggleFavorite?: () => void
}

export function ResultCard({
  work,
  onSelect,
  onInsert,
  inserting,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const insertable = hasDisplayableImage(work)

  function handleDragStart(e: React.DragEvent<HTMLImageElement>) {
    e.dataTransfer.setData('text/plain', work.key)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleDragEnd(e: React.DragEvent<HTMLImageElement>) {
    if (e.dataTransfer.dropEffect === 'none' && insertable) {
      onInsert()
    }
  }

  return (
    <li className="result-card">
      <button
        type="button"
        className="result-card__image-button"
        onClick={onSelect}
        aria-label={`Open details for ${work.title} by ${work.artist}`}
      >
        <div className="result-card__image-wrap">
          {!loaded && !imageError && <div className="result-card__skeleton" aria-hidden="true" />}
          {work.image.thumbnailUrl && !imageError ? (
            <img
              src={work.image.thumbnailUrl}
              alt=""
              className="result-card__image"
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setImageError(true)}
              data-loaded={loaded}
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ) : (
            <div className="result-card__no-image" aria-hidden="true">
              No image
            </div>
          )}

          {!isFreelyUsable(work.rights) && <span className="result-card__rights-badge">©</span>}

          <div className="result-card__overlay">
            <button
              type="button"
              className="result-card__insert"
              onClick={(e) => {
                e.stopPropagation()
                onInsert()
              }}
              disabled={inserting || !insertable}
            >
              {inserting ? 'Inserting…' : 'Insert'}
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                className="result-card__favorite"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite()
                }}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remove from collection' : 'Add to collection'}
                title={isFavorite ? 'Remove from collection' : 'Add to collection'}
              >
                {isFavorite ? '★' : '☆'}
              </button>
            )}
          </div>
        </div>
      </button>

      <div className="result-card__meta">
        <p className="result-card__title" title={work.title}>
          {work.title}
        </p>
        <p className="result-card__artist" title={work.artist}>
          <span className="result-card__provider">{getProvider(work.provider).shortLabel}</span>
          {work.artist}
          {work.dateText && <span className="result-card__year"> · {work.dateText}</span>}
        </p>
      </div>
    </li>
  )
}
