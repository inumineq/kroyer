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
  })

  it('handles items without an image', () => {
    const work = aicToArtwork({ id: 1, is_public_domain: false })
    expect(work.title).toBe('Untitled')
    expect(work.artist).toBe('Unknown artist')
    expect(work.rights).toBe('copyrighted')
    expect(work.image).toEqual({})
  })
})
