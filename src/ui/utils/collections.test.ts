import { describe, expect, it } from 'vitest'
import type { Artwork, ProviderId } from '../../shared/model'
import {
  deleteCollection,
  ensureDefaultCollection,
  favoriteIdsFor,
  makeCollection,
  planMoodBoardExport,
  removeWorkFrom,
  renameCollection,
  toggleWorkIn,
  updateSearchHistory,
} from './collections'

function work(id: string, provider: ProviderId = 'smk', image: Artwork['image'] = {}): Artwork {
  return {
    v: 1,
    provider,
    id,
    key: `${provider}:${id}`,
    title: 'T',
    artist: 'A',
    rights: 'cc0',
    image,
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
    expect(result[0].works.map((w) => w.id)).toEqual(['B', 'A'])
  })

  it('removes a work that is already present', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    const result = toggleWorkIn([col], col.id, work('A'))
    expect(result[0].works.map((w) => w.id)).toEqual(['B'])
  })

  it('leaves other collections untouched', () => {
    const a = makeCollection('A')
    const b = makeCollection('B')
    const result = toggleWorkIn([a, b], a.id, work('X'))
    expect(result[1]).toBe(b)
  })
})

describe('removeWorkFrom', () => {
  it('removes by work key', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    const result = removeWorkFrom([col], col.id, 'smk:A')
    expect(result[0].works.map((w) => w.id)).toEqual(['B'])
  })
})

describe('favoriteIdsFor', () => {
  it('collects work keys', () => {
    const col = { ...makeCollection('C'), works: [work('A'), work('B')] }
    expect(favoriteIdsFor(col)).toEqual(new Set(['smk:A', 'smk:B']))
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

// Uses the real provider registry: SMK is an iframe provider, AIC is
// 'blocked' (Cloudflare 403s every byte route — see providers/types.ts), so
// AIC works must be skipped before any fetch attempt and honestly counted.
describe('planMoodBoardExport', () => {
  const image = { thumbnailUrl: 'https://example.test/t.jpg' }

  it('keeps fetchable works and skips blocked-provider works with an honest count', () => {
    const plan = planMoodBoardExport([
      work('1', 'smk', image),
      work('2', 'aic', image),
      work('3', 'smk', image),
      work('4', 'aic', image),
    ])
    expect(plan.eligible.map((w) => w.key)).toEqual(['smk:1', 'smk:3'])
    expect(plan.blockedCount).toBe(2)
    expect(plan.skipMessage).toBe('Skipped 2 artworks (AIC images are blocked)')
  })

  it('uses singular wording for a single skipped work', () => {
    const plan = planMoodBoardExport([work('1', 'smk', image), work('2', 'aic', image)])
    expect(plan.skipMessage).toBe('Skipped 1 artwork (AIC images are blocked)')
  })

  it('does not count image-less works as blocked skips', () => {
    const plan = planMoodBoardExport([work('1', 'smk'), work('2', 'aic')])
    expect(plan.eligible).toEqual([])
    expect(plan.blockedCount).toBe(0)
    expect(plan.skipMessage).toBeUndefined()
  })

  it('reports no skip message when nothing is blocked', () => {
    const plan = planMoodBoardExport([work('1', 'smk', image)])
    expect(plan.eligible).toHaveLength(1)
    expect(plan.blockedCount).toBe(0)
    expect(plan.skipMessage).toBeUndefined()
  })
})
