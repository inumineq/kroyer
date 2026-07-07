import type { Artwork, Collection } from '../../shared/model'
import { STORAGE_KEYS } from '../../shared/storageKeys'
import { smkToArtwork } from '../providers/smk/mapper'
import type { SmkArtwork } from '../providers/smk/types'

/**
 * Collections moved to a versioned envelope under a NEW storage key with the
 * provider refactor. The legacy 'collections' key (raw SMK objects) is left
 * untouched for one release as rollback insurance (the sandbox frees it only
 * if quota pressure prevents the v2 envelope from persisting).
 */
export const COLLECTIONS_V2_KEY = STORAGE_KEYS.collectionsV2

export type CollectionsEnvelope = {
  version: 2
  collections: Collection[]
}

export function makeEnvelope(collections: Collection[]): CollectionsEnvelope {
  return { version: 2, collections }
}

/**
 * Pick the freshest stored state: a valid v2 envelope wins; otherwise fall
 * back to migrating the legacy key. Works are re-hydrated defensively in
 * both paths so a single corrupt entry never loses the whole store.
 */
export function loadCollections(v2Raw: unknown, legacyRaw: unknown): Collection[] {
  if (v2Raw && typeof v2Raw === 'object') {
    const envelope = v2Raw as Record<string, unknown>
    if (envelope.version === 2 && Array.isArray(envelope.collections)) {
      return hydrateCollections(envelope.collections)
    }
  }
  return hydrateCollections(legacyRaw)
}

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
