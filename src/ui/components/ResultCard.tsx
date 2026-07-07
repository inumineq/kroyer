import { useState } from 'react'
import type { Artwork } from '../../shared/model'
import { hasDisplayableImage, RIGHTS_DISPLAY } from '../../shared/model'
import { getProvider } from '../providers/registry'
import { useArtworkImage } from '../images/useArtworkImage'
import { postToPlugin } from '../messages'

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
  const image = useArtworkImage(work, 'thumbnail')
  // Distinguish "genuinely no image" from "fetch blocked" (AIC/Cloudflare) —
  // hasDisplayableImage means a URL exists, so an error status here means the
  // main-thread fetch failed rather than the work simply lacking an image.
  const blocked = image.status === 'error' && hasDisplayableImage(work)

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
          {!loaded && !imageError && image.lqip && (
            <img src={image.lqip} alt="" className="result-card__lqip" aria-hidden="true" />
          )}
          {!loaded && !imageError && !image.lqip && (
            <div className="result-card__skeleton" aria-hidden="true" />
          )}
          {image.src && !imageError && !blocked ? (
            <img
              src={image.src}
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
          ) : blocked ? (
            <button
              type="button"
              className="result-card__blocked"
              onClick={(e) => {
                e.stopPropagation()
                if (work.sourceUrl) postToPlugin({ type: 'open-url', url: work.sourceUrl })
              }}
            >
              Preview blocked — open on {getProvider(work.provider).shortLabel.toLowerCase()}
            </button>
          ) : (
            <div className="result-card__no-image" aria-hidden="true">
              No image
            </div>
          )}

          {RIGHTS_DISPLAY[work.rights].badge && (
            <span className="result-card__rights-badge" title={RIGHTS_DISPLAY[work.rights].label}>
              {RIGHTS_DISPLAY[work.rights].badge}
            </span>
          )}

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
