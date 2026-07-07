import type { Artwork } from '../../../shared/model'
import { artworkKey } from '../../../shared/model'
import type { SmkArtwork } from './types'

/**
 * SMK IIIF URLs look like
 *   https://iip-thumb.smk.dk/iiif/jp2/{file}.tif.jp2/full/!1024,/0/default.jpg
 * The part before `/full/` is a IIIF Image API base usable at any size.
 * Plain thumbnails (https://api.smk.dk/api/v1/thumbnail/{uuid}.jpg) are fixed-size.
 */
const IIIF_SEGMENT = /\/full\/!?\d*,\d*\//

export function extractIiifBase(url: string | undefined): string | undefined {
  if (!url || !IIIF_SEGMENT.test(url)) return undefined
  return url.slice(0, url.indexOf('/full/'))
}

function parseYear(value: string | undefined): number | undefined {
  if (!value) return undefined
  const year = Number(value.slice(0, 4))
  return Number.isFinite(year) ? year : undefined
}

export function smkToArtwork(raw: SmkArtwork): Artwork {
  const id = raw.object_number
  const extra: Record<string, string> = {}
  const objectNames = raw.object_names?.map((n) => n.name).filter(Boolean).join(', ')
  if (objectNames) extra['Type'] = objectNames
  if (raw.responsible_department) extra['Department'] = raw.responsible_department
  extra['Object no.'] = id

  return {
    v: 1,
    provider: 'smk',
    id,
    key: artworkKey('smk', id),
    title: raw.titles?.[0]?.title ?? 'Untitled',
    artist: raw.artist?.[0] ?? 'Unknown artist',
    dateText: raw.production_date?.[0]?.period,
    yearStart: parseYear(raw.production_date?.[0]?.start),
    yearEnd: parseYear(raw.production_date?.[0]?.end),
    // SMK releases public-domain works under CC0
    rights: raw.public_domain ? 'cc0' : 'copyrighted',
    creditLine: raw.credit_line?.[0],
    medium: raw.techniques?.filter(Boolean).join(', ') || undefined,
    description: raw.notes?.filter(Boolean).join('\n\n') || undefined,
    sourceUrl: raw.frontend_url,
    image: {
      thumbnailUrl: raw.image_thumbnail,
      nativeUrl: raw.image_native,
      iiifBase: extractIiifBase(raw.image_thumbnail),
      width: raw.image_width,
      height: raw.image_height,
    },
    similarUrl: raw.similar_images_url,
    extra,
  }
}
