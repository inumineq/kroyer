import { describe, expect, it } from 'vitest'
import { langValue, rijksToArtwork } from './mapper'
import { RIJKS_FIXTURE_FULL, RIJKS_FIXTURE_SPARSE } from './__fixtures__/artwork'

describe('langValue', () => {
  it('returns a plain string unchanged', () => {
    expect(langValue('hello')).toBe('hello')
  })

  it('prefers en over nl in a language-map object', () => {
    expect(langValue({ nl: 'appel', en: 'apple' })).toBe('apple')
  })

  it('falls back to nl when en is absent in a language-map object', () => {
    expect(langValue({ nl: 'appel' })).toBe('appel')
  })

  it('falls back to the first available key when neither en nor nl is present', () => {
    expect(langValue({ fr: 'pomme' })).toBe('pomme')
  })

  it('reads @value from a single {"@language","@value"} object', () => {
    expect(langValue({ '@language': 'nl', '@value': 'appel' })).toBe('appel')
  })

  it('prefers en over nl in an array of {"@language","@value"}', () => {
    expect(
      langValue([
        { '@language': 'nl', '@value': 'appel' },
        { '@language': 'en', '@value': 'apple' },
      ]),
    ).toBe('apple')
  })

  it('falls back to nl in an array when en is absent', () => {
    expect(langValue([{ '@language': 'nl', '@value': 'appel' }])).toBe('appel')
  })

  it('falls back to the first array entry when neither en nor nl is present', () => {
    expect(langValue([{ '@language': 'fr', '@value': 'pomme' }])).toBe('pomme')
  })

  it('returns undefined for undefined, empty array, or empty object', () => {
    expect(langValue(undefined)).toBeUndefined()
    expect(langValue([])).toBeUndefined()
    expect(langValue({})).toBeUndefined()
  })
})

describe('rijksToArtwork', () => {
  it('maps a full record', () => {
    const work = rijksToArtwork(RIJKS_FIXTURE_FULL, '200105339')
    expect(work).toMatchObject({
      v: 1,
      provider: 'rijks',
      id: '200105339',
      key: 'rijks:200105339',
      title: 'Schoolklas meisjes met breiwerk',
      artist: 'C. Lapine',
      dateText: '1895 - 1900',
      yearStart: 1895,
      yearEnd: 1900,
      rights: 'public-domain',
      medium: 'papier',
      sourceUrl: 'https://www.rijksmuseum.nl/nl/collectie/RP-T-00-808',
    })
    expect(work.image).toMatchObject({
      iiifBase: 'https://iiif.micr.io/oZsQW',
      thumbnailUrl: 'https://iiif.micr.io/oZsQW/full/!400,400/0/default.jpg',
      nativeUrl: 'https://iiif.micr.io/oZsQW/full/max/0/default.jpg',
    })
    expect(work.extra).toMatchObject({
      'Object no.': 'RP-T-00-808',
      Type: 'tekening',
    })
  })

  it('defaults missing fields on a sparse record', () => {
    const work = rijksToArtwork(RIJKS_FIXTURE_SPARSE, '200105340')
    expect(work.title).toBe('Ongetiteld werk')
    expect(work.artist).toBe('Unknown artist')
    expect(work.dateText).toBeUndefined()
    expect(work.yearStart).toBeUndefined()
    expect(work.yearEnd).toBeUndefined()
    expect(work.medium).toBeUndefined()
    expect(work.rights).toBe('copyrighted')
    expect(work.image).toEqual({})
  })

  describe('year parsing from `created`', () => {
    it('parses a range "1895 - 1900" into yearStart/yearEnd', () => {
      const work = rijksToArtwork(
        { aggregatedCHO: { created: [{ '@language': 'nl', '@value': '1895 - 1900' }] } },
        '1',
      )
      expect(work.yearStart).toBe(1895)
      expect(work.yearEnd).toBe(1900)
    })

    it('parses a single year "1893" into yearStart === yearEnd', () => {
      const work = rijksToArtwork(
        { aggregatedCHO: { created: [{ '@language': 'nl', '@value': '1893' }] } },
        '1',
      )
      expect(work.yearStart).toBe(1893)
      expect(work.yearEnd).toBe(1893)
    })

    it('returns undefined for unparseable garbage', () => {
      const work = rijksToArtwork(
        { aggregatedCHO: { created: [{ '@language': 'nl', '@value': 'onbekend' }] } },
        '1',
      )
      expect(work.yearStart).toBeUndefined()
      expect(work.yearEnd).toBeUndefined()
    })
  })

  describe('rights mapping', () => {
    it('maps publicdomain/zero to public-domain', () => {
      const work = rijksToArtwork(
        { edmRights: 'http://creativecommons.org/publicdomain/zero/1.0/' },
        '1',
      )
      expect(work.rights).toBe('public-domain')
    })

    it('maps publicdomain/mark to public-domain', () => {
      const work = rijksToArtwork(
        { edmRights: 'http://creativecommons.org/publicdomain/mark/1.0/' },
        '1',
      )
      expect(work.rights).toBe('public-domain')
    })

    it('maps any other rights URI to copyrighted', () => {
      const work = rijksToArtwork(
        { edmRights: 'http://rightsstatements.org/vocab/InC/1.0/' },
        '1',
      )
      expect(work.rights).toBe('copyrighted')
    })

    it('maps missing edmRights to copyrighted', () => {
      const work = rijksToArtwork({}, '1')
      expect(work.rights).toBe('copyrighted')
    })
  })
})
