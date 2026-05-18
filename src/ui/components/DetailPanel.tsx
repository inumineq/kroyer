import { useState } from 'react'
import type { Artwork } from '../api/smkClient'
import { pickImageUrl } from '../api/iiifClient'
import { postToPlugin } from '../messages'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { InsertSize } from '../types'

type Props = {
  work: Artwork
  onClose: () => void
  onInsert: (size: InsertSize, withCaption: boolean) => void
  inserting: boolean
  isFavorite: boolean
  onToggleFavorite?: () => void
}

const SIZE_OPTIONS: { value: InsertSize; label: string }[] = [
  { value: 'thumbnail', label: '300 px' },
  { value: 'medium', label: '800 px' },
  { value: 'large', label: '1600 px' },
  { value: 'native', label: 'Original' },
]

export function DetailPanel({
  work,
  onClose,
  onInsert,
  inserting,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [size, setSize] = useState<InsertSize>('medium')
  const [withCaption, setWithCaption] = useState(false)

  useEscapeKey(onClose)

  const title = work.titles?.[0]?.title ?? 'Untitled'
  const artist = work.artist?.[0] ?? 'Unknown artist'
  const period = work.production_date?.[0]?.period
  const techniques = work.techniques?.join(', ')
  const credit = work.credit_line?.[0]
  const previewUrl = pickImageUrl(work, 'medium')

  return (
    <div className="detail-panel" role="dialog" aria-modal="true" aria-label={`Details for ${title}`}>
      <header className="detail-panel__header">
        <button type="button" className="detail-panel__back" onClick={onClose} aria-label="Back to results">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M7.5 2.5L4 6l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Back</span>
        </button>
        <div className="detail-panel__header-actions">
          {onToggleFavorite && (
            <button
              type="button"
              className="detail-panel__icon-button"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? 'Remove from collection' : 'Add to collection'}
              title={isFavorite ? 'Remove from collection' : 'Add to collection'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          )}
        </div>
      </header>

      <div className="detail-panel__body">
        <div className="detail-panel__image-wrap">
          {previewUrl ? (
            <img src={previewUrl} alt={title} className="detail-panel__image" />
          ) : (
            <div className="detail-panel__no-image">No image available</div>
          )}
          {!work.public_domain && (
            <span className="detail-panel__rights-badge" title="Under copyright">
              © Under copyright
            </span>
          )}
          {work.public_domain && (
            <span className="detail-panel__pd-badge" title="Public domain (CC0)">
              Public Domain
            </span>
          )}
        </div>

        <div className="detail-panel__meta">
          <h2 className="detail-panel__title">{title}</h2>
          <p className="detail-panel__artist">
            {artist}
            {period && <span className="detail-panel__year"> · {period}</span>}
          </p>

          <dl className="detail-panel__props">
            {techniques && (
              <>
                <dt>Technique</dt>
                <dd>{techniques}</dd>
              </>
            )}
            {work.object_names?.[0]?.name && (
              <>
                <dt>Type</dt>
                <dd>{work.object_names.map((n) => n.name).join(', ')}</dd>
              </>
            )}
            {work.responsible_department && (
              <>
                <dt>Department</dt>
                <dd>{work.responsible_department}</dd>
              </>
            )}
            {work.object_number && (
              <>
                <dt>Object no.</dt>
                <dd>{work.object_number}</dd>
              </>
            )}
            {credit && (
              <>
                <dt>Credit</dt>
                <dd>{credit}</dd>
              </>
            )}
          </dl>

          {work.notes && work.notes.length > 0 && (
            <div className="detail-panel__notes">
              {work.notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          )}

          {work.frontend_url && (
            <button
              type="button"
              className="detail-panel__external"
              onClick={() => postToPlugin({ type: 'open-url', url: work.frontend_url! })}
            >
              View on open.smk.dk ↗
            </button>
          )}
        </div>
      </div>

      <footer className="detail-panel__footer">
        <div className="detail-panel__options">
          <label className="detail-panel__option-label">
            <span>Size</span>
            <select
              className="detail-panel__select"
              value={size}
              onChange={(e) => setSize(e.target.value as InsertSize)}
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="detail-panel__option-checkbox">
            <input
              type="checkbox"
              checked={withCaption}
              onChange={(e) => setWithCaption(e.target.checked)}
            />
            <span>Add caption</span>
          </label>
        </div>

        <button
          type="button"
          className="detail-panel__insert"
          onClick={() => onInsert(size, withCaption)}
          disabled={inserting || !work.image_thumbnail}
        >
          {inserting ? 'Inserting…' : 'Insert into Figma'}
        </button>
      </footer>
    </div>
  )
}
