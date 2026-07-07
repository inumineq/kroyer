import { useEffect, useState } from 'react'
import type { Artwork } from '../../shared/model'
import { getProvider } from '../providers/registry'
import { useArtworkImage } from '../images/useArtworkImage'

type Props = {
  work: Artwork
  onSelect: (work: Artwork) => void
}

export function RelatedWorks({ work, onSelect }: Props) {
  const [related, setRelated] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)

  const provider = getProvider(work.provider)
  const supported = Boolean(provider.getSimilar && work.similarUrl)

  useEffect(() => {
    if (!supported) {
      setRelated([])
      return
    }

    setLoading(true)
    const controller = new AbortController()

    provider
      .getSimilar!(work, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        const filtered = items
          .filter((r) => r.key !== work.key && r.image.thumbnailUrl)
          .slice(0, 8)
        setRelated(filtered)
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelated([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work.key, supported])

  if (!supported) return null
  if (!loading && related.length === 0) return null

  return (
    <div className="related">
      <h3 className="related__heading">Related works</h3>
      {loading ? (
        <div className="related__loading" aria-live="polite">
          Loading…
        </div>
      ) : (
        <div className="related__scroll">
          {related.map((r) => (
            <RelatedWorkItem key={r.key} work={r} onSelect={() => onSelect(r)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RelatedWorkItem({ work, onSelect }: { work: Artwork; onSelect: () => void }) {
  const image = useArtworkImage(work, 'thumbnail')
  const src = image.src ?? image.lqip
  return (
    <button
      type="button"
      className="related__item"
      onClick={onSelect}
      title={`${work.title} — ${work.artist}`}
    >
      {src && <img src={src} alt="" loading="lazy" />}
    </button>
  )
}
