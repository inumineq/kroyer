import type { Artwork, Collection } from '../../shared/model'

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
