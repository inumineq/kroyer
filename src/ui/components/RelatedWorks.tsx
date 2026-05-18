import { useEffect, useState } from 'react'
import { getSimilarArtworks, type Artwork } from '../api/smkClient'

type Props = {
  work: Artwork
  onSelect: (work: Artwork) => void
}

export function RelatedWorks({ work, onSelect }: Props) {
  const [related, setRelated] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!work.similar_images_url) {
      setRelated([])
      return
    }

    setLoading(true)
    let cancelled = false

    getSimilarArtworks(work.similar_images_url)
      .then((items) => {
        if (cancelled) return
        const filtered = items
          .filter((r) => r.object_number !== work.object_number && r.image_thumbnail)
          .slice(0, 8)
        setRelated(filtered)
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [work.object_number, work.similar_images_url])

  if (!work.similar_images_url) return null
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
            <button
              key={r.object_number}
              type="button"
              className="related__item"
              onClick={() => onSelect(r)}
              title={`${r.titles?.[0]?.title ?? 'Untitled'} — ${r.artist?.[0] ?? 'Unknown'}`}
            >
              <img src={r.image_thumbnail} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
