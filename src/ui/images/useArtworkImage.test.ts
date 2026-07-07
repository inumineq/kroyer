import { describe, expect, it } from 'vitest'
import type { Artwork } from '../../shared/model'
import { hasDisplayableImage } from '../../shared/model'
import { SIZE_PIXELS } from './sizing'
import { iframeImageUrlFor } from './useArtworkImage'

const IIIF_BASE = 'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2'

function makeWork(image: Artwork['image']): Artwork {
  return {
    v: 1,
    provider: 'smk',
    id: 'KMS3352',
    key: 'smk:KMS3352',
    title: 'T',
    artist: 'A',
    rights: 'cc0',
    image,
  }
}

describe('iframeImageUrlFor', () => {
  // Regression test: grid/related/collections cards used to render
  // work.image.thumbnailUrl directly. Once they moved onto useArtworkImage,
  // the thumbnail size started rebuilding a forced-300px IIIF URL from
  // iiifBase instead of the provider API's own thumbnail (e.g. SMK's
  // image_thumbnail), silently changing the URL. Iframe providers must stay
  // byte-identical to pre-hook behavior.
  it('prefers the provider-supplied thumbnailUrl at thumbnail size, even when iiifBase is present', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(iframeImageUrlFor(work, 'thumbnail')).toBe('https://api.smk.dk/image_thumbnail.jpg')
  })

  it('falls back to imageUrlFor at thumbnail size when thumbnailUrl is absent', () => {
    const work = makeWork({ iiifBase: IIIF_BASE })
    expect(iframeImageUrlFor(work, 'thumbnail')).toBe(
      `${IIIF_BASE}/full/!${SIZE_PIXELS.thumbnail},/0/default.jpg`,
    )
  })

  it('uses imageUrlFor (exact-size IIIF) for non-thumbnail sizes, same as before', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(iframeImageUrlFor(work, 'medium')).toBe(
      `${IIIF_BASE}/full/!${SIZE_PIXELS.medium},/0/default.jpg`,
    )
  })

  it('returns undefined when the work has no displayable image', () => {
    expect(iframeImageUrlFor(makeWork({}), 'thumbnail')).toBeUndefined()
  })
})

// Regression test for ResultCard's "blocked" state: `useArtworkImage`
// reports status 'error' whenever there's no URL to render — including the
// ordinary case of a work with no image at all, not just a failed
// main-thread fetch. Consumers (ResultCard, DetailPanel) must additionally
// gate on hasDisplayableImage(work) so a no-image work renders the neutral
// "No image" state instead of "Preview blocked". This locks in the inputs
// to that gate: an image-less work is both status-'error' AND
// hasDisplayableImage() === false, so `status === 'error' &&
// hasDisplayableImage(work)` correctly evaluates to false for it.
describe('no-image works never look "blocked"', () => {
  it('a work with no image URL is both error-status and not hasDisplayableImage', () => {
    const work = makeWork({})
    expect(iframeImageUrlFor(work, 'thumbnail')).toBeUndefined()
    expect(hasDisplayableImage(work)).toBe(false)
  })

  it('a work with a thumbnailUrl is hasDisplayableImage, so a real fetch error can be "blocked"', () => {
    const work = makeWork({ thumbnailUrl: 'https://api.smk.dk/image_thumbnail.jpg' })
    expect(hasDisplayableImage(work)).toBe(true)
  })
})
