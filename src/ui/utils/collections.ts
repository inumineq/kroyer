import type { Artwork, Collection } from '../../shared/model'
import { hasDisplayableImage } from '../../shared/model'
import { getProvider } from '../providers/registry'

export function makeCollection(name: string): Collection {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    createdAt: new Date().toISOString(),
    works: [],
  }
}

export function ensureDefaultCollection(collections: Collection[]): Collection[] {
  if (collections.length > 0) return collections
  return [makeCollection('Favorites')]
}

export function toggleWorkIn(
  collections: Collection[],
  collectionId: string,
  work: Artwork,
): Collection[] {
  return collections.map((c) => {
    if (c.id !== collectionId) return c
    const exists = c.works.some((w) => w.key === work.key)
    return {
      ...c,
      works: exists ? c.works.filter((w) => w.key !== work.key) : [work, ...c.works],
    }
  })
}

export function removeWorkFrom(
  collections: Collection[],
  collectionId: string,
  workKey: string,
): Collection[] {
  return collections.map((c) =>
    c.id === collectionId
      ? { ...c, works: c.works.filter((w) => w.key !== workKey) }
      : c,
  )
}

export function favoriteIdsFor(collection: Collection | undefined): Set<string> {
  if (!collection) return new Set()
  return new Set(collection.works.map((w) => w.key))
}

export function updateSearchHistory(history: string[], query: string, max = 5): string[] {
  const trimmed = query.trim()
  if (!trimmed) return history
  const filtered = history.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())
  return [trimmed, ...filtered].slice(0, max)
}

export function renameCollection(
  collections: Collection[],
  id: string,
  name: string,
): Collection[] {
  return collections.map((c) => (c.id === id ? { ...c, name } : c))
}

export function deleteCollection(collections: Collection[], id: string): Collection[] {
  return collections.filter((c) => c.id !== id)
}

export type MoodBoardExportPlan = {
  /** Works whose image bytes can actually be fetched for the board */
  eligible: Artwork[]
  /** Works with an image that were skipped because their provider's images are blocked */
  blockedCount: number
  /** Honest notify message for the skipped works; undefined when nothing was skipped */
  skipMessage?: string
}

/**
 * Partitions a collection's works for mood-board export. Works without a
 * displayable image are dropped silently (as before); works from providers
 * whose images are blocked (imageLoading: 'blocked' — AIC, see
 * providers/types.ts) are skipped WITHOUT attempting a fetch that is
 * guaranteed to 403, and counted so the UI can report an honest skip count
 * instead of dropping them silently.
 */
export function planMoodBoardExport(works: Artwork[]): MoodBoardExportPlan {
  const eligible: Artwork[] = []
  const blockedLabels: string[] = []
  let blockedCount = 0

  for (const work of works.filter(hasDisplayableImage)) {
    const provider = getProvider(work.provider)
    if (provider.imageLoading === 'blocked') {
      blockedCount++
      if (blockedLabels.indexOf(provider.shortLabel) === -1) blockedLabels.push(provider.shortLabel)
    } else {
      eligible.push(work)
    }
  }

  const skipMessage =
    blockedCount > 0
      ? `Skipped ${blockedCount} ${blockedCount === 1 ? 'artwork' : 'artworks'} (${blockedLabels.join('/')} images are blocked)`
      : undefined

  return { eligible, blockedCount, skipMessage }
}
