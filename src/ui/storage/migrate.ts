import type { Artwork, Collection } from '../../shared/model'
import { smkToArtwork } from '../providers/smk/mapper'
import type { SmkArtwork } from '../providers/smk/types'

/**
 * Collections persisted before the provider refactor stored raw SMK API
 * objects. Detect the shape per work and map legacy ones through the SMK
 * mapper; unmappable entries are skipped rather than failing the whole load.
 */
function hydrateWork(raw: unknown): Artwork | null {
  if (!raw || typeof raw !== 'object') return null
  const work = raw as Record<string, unknown>
  try {
    if (typeof work.key === 'string' && typeof work.provider === 'string') {
      return work as unknown as Artwork
    }
    if (typeof work.object_number === 'string') {
      return smkToArtwork(work as unknown as SmkArtwork)
    }
  } catch {
    // fall through — skip the entry
  }
  return null
}

export function hydrateCollections(raw: unknown): Collection[] {
  if (!Array.isArray(raw)) return []
  const collections: Collection[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const c = entry as Record<string, unknown>
    if (typeof c.id !== 'string' || typeof c.name !== 'string') continue
    collections.push({
      id: c.id,
      name: c.name,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
      works: Array.isArray(c.works)
        ? c.works.map(hydrateWork).filter((w): w is Artwork => w !== null)
        : [],
    })
  }
  return collections
}
