import { describe, expect, it } from 'vitest'
import { aicToArtwork } from './mapper'
import type { AicArtwork } from './types'

const FULL: AicArtwork = {
  id: 27992,
  title: 'A Sunday on La Grande Jatte — 1884',
  artist_display: 'Georges Seurat\nFrench, 1859-1891',
  date_display: '1884–86',
  date_start: 1884,
  date_end: 1886,
  is_public_domain: true,
  image_id: '2d484387-2509-5e8e-2c43-22f9981972eb',
  medium_display: 'Oil on canvas',
  credit_line: 'Helen Birch Bartlett Memorial Collection',
  department_title: 'Painting and Sculpture of Europe',
  artwork_type_title: 'Painting',
  thumbnail: {
    lqip: 'data:image/gif;base64,AAAA',
    alt_text: 'A pointillist painting of people relaxing by a river.',
    width: 4096,
    height: 3099,
  },
}

describe('aicToArtwork', () => {
  it('maps a full item with IIIF urls', () => {
    const work = aicToArtwork(FULL)
    expect(work).toMatchObject({
      provider: 'aic',
      id: '27992',
      key: 'aic:27992',
      title: 'A Sunday on La Grande Jatte — 1884',
      dateText: '1884–86',
      yearStart: 1884,
      yearEnd: 1886,
      rights: 'cc0',
      medium: 'Oil on canvas',
      sourceUrl: 'https://www.artic.edu/artworks/27992',
    })
    expect(work.image.iiifBase).toBe(
      'https://www.artic.edu/iiif/2/2d484387-2509-5e8e-2c43-22f9981972eb',
    )
    expect(work.image.thumbnailUrl).toContain('/full/400,/0/default.jpg')
    expect(work.image.width).toBeUndefined()
    expect(work.image.lqip).toBe('data:image/gif;base64,AAAA')
    expect(work.image.altText).toBe('A pointillist painting of people relaxing by a river.')
  })

  it('handles items without an image', () => {
    const work = aicToArtwork({ id: 1, is_public_domain: false })
    expect(work.title).toBe('Untitled')
    expect(work.artist).toBe('Unknown artist')
    expect(work.rights).toBe('copyrighted')
    expect(work.image).toEqual({})
  })

  it('tolerates a null thumbnail block', () => {
    const work = aicToArtwork({
      id: 2,
      is_public_domain: true,
      image_id: 'abc-123',
      thumbnail: null,
    })
    expect(work.image.iiifBase).toBe('https://www.artic.edu/iiif/2/abc-123')
    expect(work.image.lqip).toBeUndefined()
    expect(work.image.altText).toBeUndefined()
  })

  it('tolerates null lqip/alt_text fields within a present thumbnail block', () => {
    const work = aicToArtwork({
      id: 3,
      is_public_domain: true,
      image_id: 'def-456',
      thumbnail: { lqip: null, alt_text: null, width: null, height: null },
    })
    expect(work.image.lqip).toBeUndefined()
    expect(work.image.altText).toBeUndefined()
  })
})
