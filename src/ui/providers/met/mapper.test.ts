import { describe, expect, it } from 'vitest'
import { metToArtwork } from './mapper'
import type { MetObject } from './types'

const FULL: MetObject = {
  objectID: 436535,
  accessionNumber: '58.75',
  isPublicDomain: true,
  primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg',
  primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1567.jpg',
  title: 'Wheat Field with Cypresses',
  artistDisplayName: 'Vincent van Gogh',
  objectDate: '1889',
  objectBeginDate: 1889,
  objectEndDate: 1889,
  medium: 'Oil on canvas',
  creditLine: 'Purchase, The Annenberg Foundation Gift, 1993',
  department: 'European Paintings',
  objectName: 'Painting',
  objectURL: 'https://www.metmuseum.org/art/collection/search/436535',
}

describe('metToArtwork', () => {
  it('maps a full object', () => {
    const work = metToArtwork(FULL)
    expect(work).toMatchObject({
      provider: 'met',
      id: '436535',
      key: 'met:436535',
      title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh',
      dateText: '1889',
      yearStart: 1889,
      yearEnd: 1889,
      rights: 'cc0',
      medium: 'Oil on canvas',
      sourceUrl: 'https://www.metmuseum.org/art/collection/search/436535',
    })
    expect(work.image.thumbnailUrl).toContain('web-large')
    expect(work.image.nativeUrl).toContain('original')
  })

  it('handles empty-string fields and non-PD works', () => {
    const work = metToArtwork({
      objectID: 1,
      title: '',
      artistDisplayName: '',
      primaryImage: '',
      primaryImageSmall: '',
      isPublicDomain: false,
    })
    expect(work.title).toBe('Untitled')
    expect(work.artist).toBe('Unknown artist')
    expect(work.rights).toBe('copyrighted')
    expect(work.image.thumbnailUrl).toBeUndefined()
    expect(work.image.nativeUrl).toBeUndefined()
  })
})
