import { useState } from 'react'
import type { Artwork } from '../api/smkClient'

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

  const title = work.titles?.[0]?.title ?? 'Untitled'
  const artist = work.artist?.[0] ?? 'Unknown artist'
  const year = work.production_date?.[0]?.period

  return (
    <li className="result-card">
      <button
        type="button"
        className="result-card__image-button"
        onClick={onSelect}
        aria-label={`Open details for ${title} by ${artist}`}
      >
        <div className="result-card__image-wrap">
          {!loaded && !imageError && <div className="result-card__skeleton" aria-hidden="true" />}
          {work.image_thumbnail && !imageError ? (
            <img
              src={work.image_thumbnail}
              alt=""
              className="result-card__image"
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setImageError(true)}
              data-loaded={loaded}
            />
          ) : (
            <div className="result-card__no-image" aria-hidden="true">
              No image
            </div>
          )}

          {!work.public_domain && <span className="result-card__rights-badge">©</span>}

          <div className="result-card__overlay">
            <button
              type="button"
              className="result-card__insert"
              onClick={(e) => {
                e.stopPropagation()
                onInsert()
              }}
              disabled={inserting || !work.image_thumbnail}
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
        <p className="result-card__title" title={title}>
          {title}
        </p>
        <p className="result-card__artist" title={artist}>
          {artist}
          {year && <span className="result-card__year"> · {year}</span>}
        </p>
      </div>
    </li>
  )
}
