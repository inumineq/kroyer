import { describe, expect, it } from 'vitest'
import { pickImageUrl, resizeImage, SIZE_PIXELS } from './iiifClient'

const IIIF_URL =
  'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2/full/!1024,/0/default.jpg'
const PLAIN_URL = 'https://api.smk.dk/api/v1/thumbnail/abc-123.jpg'

describe('resizeImage', () => {
  it('rewrites the IIIF size segment', () => {
    expect(resizeImage(IIIF_URL, 300)).toBe(
      'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2/full/!300,/0/default.jpg',
    )
  })

  it('returns non-IIIF URLs unchanged', () => {
    expect(resizeImage(PLAIN_URL, 300)).toBe(PLAIN_URL)
  })
})

describe('pickImageUrl', () => {
  const artwork = { image_thumbnail: IIIF_URL, image_native: 'https://example.smk.dk/native.jpg' }

  it('returns the native URL for native size', () => {
    expect(pickImageUrl(artwork, 'native')).toBe(artwork.image_native)
  })

  it('falls back to thumbnail when native is missing', () => {
    expect(pickImageUrl({ image_thumbnail: IIIF_URL }, 'native')).toBe(IIIF_URL)
  })

  it('resizes the thumbnail for preset sizes', () => {
    expect(pickImageUrl(artwork, 'medium')).toContain(`!${SIZE_PIXELS.medium},`)
    expect(pickImageUrl(artwork, 'large')).toContain(`!${SIZE_PIXELS.large},`)
  })

  it('falls back to native when thumbnail is missing', () => {
    expect(pickImageUrl({ image_native: 'x' }, 'medium')).toBe('x')
  })

  it('returns undefined when no image exists', () => {
    expect(pickImageUrl({}, 'medium')).toBeUndefined()
  })
})
