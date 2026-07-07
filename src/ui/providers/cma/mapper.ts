import type { Artwork } from '../../../shared/model'
import { artworkKey } from '../../../shared/model'
import type { CmaArtwork } from './types'

function toNumber(value: string | number | undefined): number | undefined {
  if (value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function cmaToArtwork(raw: CmaArtwork): Artwork {
  const id = String(raw.id)
  const web = raw.images?.web
  const full = raw.images?.full ?? raw.images?.print

  const extra: Record<string, string> = {}
  if (raw.type) extra['Type'] = raw.type
  if (raw.department) extra['Department'] = raw.department
  if (raw.accession_number) extra['Accession no.'] = raw.accession_number

  return {
    v: 1,
    provider: 'cma',
    id,
    key: artworkKey('cma', id),
    title: raw.title ?? 'Untitled',
    artist: raw.creators?.[0]?.description ?? 'Unknown artist',
    dateText: raw.creation_date ?? undefined,
    yearStart: raw.creation_date_earliest ?? undefined,
    yearEnd: raw.creation_date_latest ?? undefined,
    rights: raw.share_license_status?.toUpperCase() === 'CC0' ? 'cc0' : 'copyrighted',
    creditLine: raw.creditline ?? undefined,
    medium: raw.technique ?? undefined,
    sourceUrl: raw.url ?? undefined,
    image: {
      thumbnailUrl: web?.url,
      nativeUrl: full?.url ?? web?.url,
      // Dimensions of the native image let sizing/downscale guard >4096px
      width: toNumber(full?.width ?? web?.width),
      height: toNumber(full?.height ?? web?.height),
    },
    extra,
  }
}
