import type { Artwork } from '../../../shared/model'
import { artworkKey } from '../../../shared/model'
import { iiifImageUrl } from '../../images/sizing'
import type { AicArtwork } from './types'

const IIIF_URL = 'https://www.artic.edu/iiif/2'

/** AIC's high-res documented size — the largest we request. */
const NATIVE_PX = 1686

export function aicToArtwork(raw: AicArtwork): Artwork {
  const id = String(raw.id)
  const iiifBase = raw.image_id ? `${IIIF_URL}/${raw.image_id}` : undefined
  const lqip = raw.thumbnail?.lqip ?? undefined
  const altText = raw.thumbnail?.alt_text ?? undefined

  const extra: Record<string, string> = {}
  if (raw.artwork_type_title) extra['Type'] = raw.artwork_type_title
  if (raw.department_title) extra['Department'] = raw.department_title
  extra['Reference no.'] = id

  return {
    v: 1,
    provider: 'aic',
    id,
    key: artworkKey('aic', id),
    title: raw.title ?? 'Untitled',
    artist: raw.artist_display ?? 'Unknown artist',
    dateText: raw.date_display ?? undefined,
    yearStart: raw.date_start ?? undefined,
    yearEnd: raw.date_end ?? undefined,
    // AIC public-domain works are released under CC0
    rights: raw.is_public_domain ? 'cc0' : 'copyrighted',
    creditLine: raw.credit_line ?? undefined,
    medium: raw.medium_display ?? undefined,
    sourceUrl: `https://www.artic.edu/artworks/${id}`,
    image: iiifBase
      ? {
          // iiifImageUrl owns AIC's IIIF dialect and documented-size snapping
          thumbnailUrl: iiifImageUrl(iiifBase, 400, 'aic'),
          nativeUrl: iiifImageUrl(iiifBase, NATIVE_PX, 'aic'),
          iiifBase,
          // Intentionally no width/height: the native-size IIIF clamp in
          // imageUrlFor must not request beyond AIC's documented sizes.
          // lqip/altText are optional — pre-fix collection snapshots and
          // items AIC didn't index a thumbnail block for leave them undefined.
          lqip,
          altText,
        }
      : {},
    extra,
  }
}
