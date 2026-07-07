import { describe, expect, it } from 'vitest'
import { hydrateCollections, loadCollections, makeEnvelope } from './migrate'
import { SMK_FIXTURE_FULL } from '../providers/smk/__fixtures__/artwork'
import { smkToArtwork } from '../providers/smk/mapper'

describe('hydrateCollections', () => {
  it('maps legacy raw-SMK works through the mapper', () => {
    const legacy = [
      {
        id: 'c1',
        name: 'Favorites',
        createdAt: '2026-01-01T00:00:00.000Z',
        works: [SMK_FIXTURE_FULL],
      },
    ]
    const result = hydrateCollections(legacy)
    expect(result).toHaveLength(1)
    expect(result[0].works[0].key).toBe('smk:KMS3352')
    expect(result[0].works[0].title).toBe('Sommeraften ved Skagens strand')
  })

  it('passes already-normalized works through unchanged', () => {
    const normalized = smkToArtwork(SMK_FIXTURE_FULL)
    const result = hydrateCollections([
      { id: 'c1', name: 'F', createdAt: 'x', works: [normalized] },
    ])
    expect(result[0].works[0]).toBe(normalized)
  })

  it('skips unmappable works instead of failing', () => {
    const result = hydrateCollections([
      { id: 'c1', name: 'F', createdAt: 'x', works: [null, 42, { bogus: true }, SMK_FIXTURE_FULL] },
    ])
    expect(result[0].works).toHaveLength(1)
  })

  it('returns empty for non-array input', () => {
    expect(hydrateCollections(undefined)).toEqual([])
    expect(hydrateCollections({})).toEqual([])
  })

  it('skips malformed collection entries', () => {
    const result = hydrateCollections([{ name: 'no id' }, null])
    expect(result).toEqual([])
  })
})

describe('loadCollections', () => {
  const normalized = smkToArtwork(SMK_FIXTURE_FULL)
  const v2 = makeEnvelope([{ id: 'c1', name: 'V2', createdAt: 'x', works: [normalized] }])
  const legacy = [{ id: 'c2', name: 'Legacy', createdAt: 'x', works: [SMK_FIXTURE_FULL] }]

  it('prefers a valid v2 envelope over legacy data', () => {
    const result = loadCollections(v2, legacy)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('V2')
  })

  it('falls back to migrating legacy data when v2 is absent', () => {
    const result = loadCollections(undefined, legacy)
    expect(result[0].name).toBe('Legacy')
    expect(result[0].works[0].key).toBe('smk:KMS3352')
  })

  it('falls back when the v2 value is malformed', () => {
    expect(loadCollections({ version: 99 }, legacy)[0].name).toBe('Legacy')
    expect(loadCollections('garbage', legacy)[0].name).toBe('Legacy')
  })

  it('returns empty when nothing is stored', () => {
    expect(loadCollections(undefined, undefined)).toEqual([])
  })
})
