import { describe, expect, it } from 'vitest'
import type { Artwork } from '../../shared/model'
import { FIGMA_MAX_IMAGE_PX, imageUrlFor, SIZE_PIXELS } from './sizing'

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

describe('imageUrlFor', () => {
  it('builds exact-size IIIF URLs for presets', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, thumbnailUrl: 'thumb.jpg' })
    expect(imageUrlFor(work, 'medium')).toBe(
      `${IIIF_BASE}/full/!${SIZE_PIXELS.medium},/0/default.jpg`,
    )
  })

  it('falls back to the fixed thumbnail without IIIF for small presets', () => {
    const work = makeWork({ thumbnailUrl: 'thumb.jpg', nativeUrl: 'native.jpg' })
    expect(imageUrlFor(work, 'thumbnail')).toBe('thumb.jpg')
    expect(imageUrlFor(work, 'medium')).toBe('thumb.jpg')
  })

  it('prefers the native image for large on fixed-URL providers', () => {
    const work = makeWork({ thumbnailUrl: 'thumb.jpg', nativeUrl: 'native.jpg' })
    expect(imageUrlFor(work, 'large')).toBe('native.jpg')
    // still falls back to the thumbnail when no native exists
    expect(imageUrlFor(makeWork({ thumbnailUrl: 'thumb.jpg' }), 'large')).toBe('thumb.jpg')
  })

  it('snaps AIC requests to documented sizes with strict IIIF 2.0 syntax', () => {
    const work = { ...makeWork({ iiifBase: 'https://www.artic.edu/iiif/2/abc' }), provider: 'aic' as const }
    expect(imageUrlFor(work, 'thumbnail')).toBe('https://www.artic.edu/iiif/2/abc/full/400,/0/default.jpg')
    expect(imageUrlFor(work, 'medium')).toBe('https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg')
    expect(imageUrlFor(work, 'large')).toBe('https://www.artic.edu/iiif/2/abc/full/1686,/0/default.jpg')
  })

  it('returns the native URL for native size', () => {
    const work = makeWork({ nativeUrl: 'native.jpg', thumbnailUrl: 'thumb.jpg' })
    expect(imageUrlFor(work, 'native')).toBe('native.jpg')
  })

  it('clamps oversized native images via IIIF when dimensions are known', () => {
    const work = makeWork({
      iiifBase: IIIF_BASE,
      nativeUrl: 'native.jpg',
      width: 9000,
      height: 6000,
    })
    expect(imageUrlFor(work, 'native')).toBe(
      `${IIIF_BASE}/full/!${FIGMA_MAX_IMAGE_PX},/0/default.jpg`,
    )
  })

  it('keeps the native URL when within Figma limits', () => {
    const work = makeWork({ iiifBase: IIIF_BASE, nativeUrl: 'native.jpg', width: 2000, height: 1500 })
    expect(imageUrlFor(work, 'native')).toBe('native.jpg')
  })

  it('returns undefined when no image exists', () => {
    expect(imageUrlFor(makeWork({}), 'medium')).toBeUndefined()
  })
})
