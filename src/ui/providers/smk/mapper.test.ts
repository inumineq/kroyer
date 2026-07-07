import { describe, expect, it } from 'vitest'
import { extractIiifBase, smkToArtwork } from './mapper'
import { SMK_FIXTURE_FULL, SMK_FIXTURE_SPARSE } from './__fixtures__/artwork'

describe('extractIiifBase', () => {
  it('extracts the base from a IIIF URL', () => {
    expect(extractIiifBase(SMK_FIXTURE_FULL.image_thumbnail)).toBe(
      'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2',
    )
  })

  it('returns undefined for fixed-size thumbnails', () => {
    expect(extractIiifBase(SMK_FIXTURE_SPARSE.image_thumbnail)).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(extractIiifBase(undefined)).toBeUndefined()
  })
})

describe('smkToArtwork', () => {
  it('maps a full item', () => {
    const work = smkToArtwork(SMK_FIXTURE_FULL)
    expect(work).toMatchObject({
      v: 1,
      provider: 'smk',
      id: 'KMS3352',
      key: 'smk:KMS3352',
      title: 'Sommeraften ved Skagens strand',
      artist: 'P.S. Krøyer',
      dateText: '1893',
      yearStart: 1893,
      yearEnd: 1893,
      rights: 'cc0',
      creditLine: 'Købt 1908',
      medium: 'Oil on canvas',
      sourceUrl: 'https://open.smk.dk/artwork/image/KMS3352',
      similarUrl: 'https://similar.api.smk.dk/similar/?object_number=KMS3352',
    })
    expect(work.image).toMatchObject({
      iiifBase: 'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2',
      width: 6810,
      height: 4788,
    })
    expect(work.extra).toMatchObject({
      Type: 'maleri',
      Department: 'Maleri og Skulptur 1550-1900',
      'Object no.': 'KMS3352',
    })
  })

  it('derives sourceUrl from the object number when frontend_url is absent', () => {
    // frontend_url is never in search responses — requesting it via fields=
    // makes the API 500, so the provider omits it and the mapper derives it.
    const work = smkToArtwork(SMK_FIXTURE_SPARSE)
    expect(work.sourceUrl).toBe('https://open.smk.dk/artwork/image/KKS1234')
  })

  it('defaults missing fields on a sparse item', () => {
    const work = smkToArtwork(SMK_FIXTURE_SPARSE)
    expect(work.title).toBe('Untitled')
    expect(work.artist).toBe('Unknown artist')
    expect(work.rights).toBe('copyrighted')
    expect(work.dateText).toBeUndefined()
    expect(work.medium).toBeUndefined()
    expect(work.image.iiifBase).toBeUndefined()
    expect(work.image.thumbnailUrl).toBe(SMK_FIXTURE_SPARSE.image_thumbnail)
  })
})
