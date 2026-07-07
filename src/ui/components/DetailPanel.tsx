import { Fragment, useState } from 'react'
import type { Artwork } from '../../shared/model'
import { hasDisplayableImage, isFreelyUsable, RIGHTS_DISPLAY } from '../../shared/model'
import { imageUrlFor } from '../images/sizing'
import { getProvider } from '../providers/registry'
import { postToPlugin } from '../messages'
import { useEscapeKey } from '../hooks/useEscapeKey'
import type { InsertSize } from '../types'
import { PaletteSection } from './PaletteSection'
import { RelatedWorks } from './RelatedWorks'

type Props = {
  work: Artwork
  onClose: () => void
  onInsert: (size: InsertSize, withCaption: boolean) => void
  onSelectRelated: (work: Artwork) => void
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
  onSelectRelated,
  inserting,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [size, setSize] = useState<InsertSize>('medium')
  const [withCaption, setWithCaption] = useState(false)

  useEscapeKey(onClose)

  const provider = getProvider(work.provider)
  const previewUrl = imageUrlFor(work, 'medium')
  const freelyUsable = isFreelyUsable(work.rights)
  const paragraphs = work.description?.split('\n\n') ?? []

  return (
    <div className="detail-panel" role="dialog" aria-modal="true" aria-label={`Details for ${work.title}`}>
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
            <img src={previewUrl} alt={work.title} className="detail-panel__image" />
          ) : (
            <div className="detail-panel__no-image">No image available</div>
          )}
          {freelyUsable ? (
            <span className="detail-panel__pd-badge" title="Free to use, including commercially">
              {RIGHTS_DISPLAY[work.rights].label}
            </span>
          ) : (
            <span className="detail-panel__rights-badge" title={RIGHTS_DISPLAY[work.rights].label}>
              {RIGHTS_DISPLAY[work.rights].label}
            </span>
          )}
        </div>

        <div className="detail-panel__meta">
          <h2 className="detail-panel__title">{work.title}</h2>
          <p className="detail-panel__artist">
            {work.artist}
            {work.dateText && <span className="detail-panel__year"> · {work.dateText}</span>}
          </p>

          <dl className="detail-panel__props">
            {work.medium && (
              <>
                <dt>Technique</dt>
                <dd>{work.medium}</dd>
              </>
            )}
            {Object.entries(work.extra ?? {}).map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
            {work.creditLine && (
              <>
                <dt>Credit</dt>
                <dd>{work.creditLine}</dd>
              </>
            )}
          </dl>

          {paragraphs.length > 0 && (
            <div className="detail-panel__notes">
              {paragraphs.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          )}

          <PaletteSection work={work} />

          <RelatedWorks work={work} onSelect={onSelectRelated} />

          {work.sourceUrl && (
            <button
              type="button"
              className="detail-panel__external"
              onClick={() => postToPlugin({ type: 'open-url', url: work.sourceUrl! })}
            >
              View on {provider.shortLabel} ↗
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
          disabled={inserting || !hasDisplayableImage(work)}
        >
          {inserting ? 'Inserting…' : 'Insert into Figma'}
        </button>
      </footer>
    </div>
  )
}
