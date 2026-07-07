import { describe, expect, it } from 'vitest'
import { cmaToArtwork } from './mapper'
import type { CmaArtwork } from './types'

const FULL: CmaArtwork = {
  id: 94979,
  accession_number: '1958.39',
  title: 'Water Lilies (Agapanthus)',
  creators: [{ description: 'Claude Monet (French, 1840-1926)' }],
  creation_date: 'c. 1915-26',
  creation_date_earliest: 1915,
  creation_date_latest: 1926,
  technique: 'oil on canvas',
  department: 'Modern European Painting and Sculpture',
  type: 'Painting',
  images: {
    web: { url: 'https://openaccess-cdn.clevelandart.org/1958.39/1958.39_web.jpg', width: '893', height: '400' },
    print: { url: 'https://openaccess-cdn.clevelandart.org/1958.39/1958.39_print.jpg', width: '3400', height: '1524' },
    full: { url: 'https://openaccess-cdn.clevelandart.org/1958.39/1958.39_full.tif', width: '9844', height: '4412' },
  },
  share_license_status: 'CC0',
  url: 'https://clevelandart.org/art/1958.39',
  creditline: 'John L. Severance Fund',
}

describe('cmaToArtwork', () => {
  it('maps a full item', () => {
    const work = cmaToArtwork(FULL)
    expect(work).toMatchObject({
      provider: 'cma',
      id: '94979',
      key: 'cma:94979',
      title: 'Water Lilies (Agapanthus)',
      artist: 'Claude Monet (French, 1840-1926)',
      dateText: 'c. 1915-26',
      yearStart: 1915,
      yearEnd: 1926,
      rights: 'cc0',
      medium: 'oil on canvas',
      creditLine: 'John L. Severance Fund',
      sourceUrl: 'https://clevelandart.org/art/1958.39',
    })
    // Native must be the print JPEG — browsers can't decode the full TIFF
    expect(work.image.nativeUrl).toContain('_print.jpg')
    // Native dims parsed from strings so the >4096px downscale guard works
    expect(work.image.width).toBe(3400)
    expect(work.image.height).toBe(1524)
    expect(work.image.iiifBase).toBeUndefined()
  })

  it('falls back to the web image when print is missing', () => {
    const work = cmaToArtwork({ ...FULL, images: { web: FULL.images!.web, full: FULL.images!.full } })
    expect(work.image.nativeUrl).toContain('_web.jpg')
  })

  it('maps non-CC0 licenses to copyrighted and defaults missing fields', () => {
    const work = cmaToArtwork({ id: 1, share_license_status: 'Copyrighted' })
    expect(work.rights).toBe('copyrighted')
    expect(work.title).toBe('Untitled')
    expect(work.image).toEqual({ thumbnailUrl: undefined, nativeUrl: undefined, width: undefined, height: undefined })
  })
})
