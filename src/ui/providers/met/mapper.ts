import type { Artwork } from '../../../shared/model'
import { artworkKey } from '../../../shared/model'
import type { MetObject } from './types'

export function metToArtwork(raw: MetObject): Artwork {
  const id = String(raw.objectID)

  const extra: Record<string, string> = {}
  if (raw.objectName) extra['Type'] = raw.objectName
  if (raw.department) extra['Department'] = raw.department
  if (raw.accessionNumber) extra['Accession no.'] = raw.accessionNumber

  return {
    v: 1,
    provider: 'met',
    id,
    key: artworkKey('met', id),
    title: raw.title || 'Untitled',
    artist: raw.artistDisplayName || 'Unknown artist',
    dateText: raw.objectDate || undefined,
    yearStart: raw.objectBeginDate ?? undefined,
    yearEnd: raw.objectEndDate ?? undefined,
    // The Met releases public-domain works under CC0 (Open Access)
    rights: raw.isPublicDomain ? 'cc0' : 'copyrighted',
    creditLine: raw.creditLine || undefined,
    medium: raw.medium || undefined,
    sourceUrl: raw.objectURL || undefined,
    image: {
      thumbnailUrl: raw.primaryImageSmall || undefined,
      nativeUrl: raw.primaryImage || raw.primaryImageSmall || undefined,
      // No reported dimensions; the canvas downscale guards oversized natives
    },
    extra,
  }
}
