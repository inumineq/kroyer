import { describe, expect, it } from 'vitest'
import type { Artwork } from '../api/smkClient'
import {
  deleteCollection,
  ensureDefaultCollection,
  favoriteIdsFor,
  makeCollection,
  removeWorkFrom,
  renameCollection,
  toggleWorkIn,
  updateSearchHistory,
} from './collections'

function work(objectNumber: string): Artwork {
  return {
    id: objectNumber,
    object_number: objectNumber,
    has_image: true,
    public_domain: true,
  }
}

describe('ensureDefaultCollection', () => {
  it('creates a Favorites collection when empty', () => {
    const result = ensureDefaultCollection([])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Favorites')
  })

  it('returns existing collections untouched', () => {
    const existing = [makeCollection('Mine')]
    expect(ensureDefaultCollection(existing)).toBe(existing)
  })
})

describe('toggleWorkIn', () => {
  it('adds a work that is not present, newest first', () => {
    const col = { ...makeCollection('C'), works: [work('A')] }
    const result = toggleWorkIn([col], col.id, work('B'))
    expect(result[0].works.map((w) => w.object_number)).toEqual(['B', 'A'])
  })

  it('removes a work that is already present', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    const result = toggleWorkIn([col], col.id, work('A'))
    expect(result[0].works.map((w) => w.object_number)).toEqual(['B'])
  })

  it('leaves other collections untouched', () => {
    const a = makeCollection('A')
    const b = makeCollection('B')
    const result = toggleWorkIn([a, b], a.id, work('X'))
    expect(result[1]).toBe(b)
  })
})

describe('removeWorkFrom', () => {
  it('removes by object number', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    const result = removeWorkFrom([col], col.id, 'A')
    expect(result[0].works.map((w) => w.object_number)).toEqual(['B'])
  })
})

describe('favoriteIdsFor', () => {
  it('collects object numbers', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    expect(favoriteIdsFor(col)).toEqual(new Set(['A', 'B']))
  })

  it('returns an empty set for undefined', () => {
    expect(favoriteIdsFor(undefined).size).toBe(0)
  })
})

describe('updateSearchHistory', () => {
  it('prepends and dedupes case-insensitively', () => {
    expect(updateSearchHistory(['Monet', 'krøyer'], 'KRØYER')).toEqual(['KRØYER', 'Monet'])
  })

  it('ignores blank queries', () => {
    expect(updateSearchHistory(['a'], '   ')).toEqual(['a'])
  })

  it('caps at max entries', () => {
    expect(updateSearchHistory(['a', 'b', 'c', 'd', 'e'], 'f')).toHaveLength(5)
  })
})

describe('rename/delete collection', () => {
  it('renames by id', () => {
    const col = makeCollection('Old')
    expect(renameCollection([col], col.id, 'New')[0].name).toBe('New')
  })

  it('deletes by id', () => {
    const col = makeCollection('Gone')
    expect(deleteCollection([col], col.id)).toEqual([])
  })
})
