import type { Artwork } from '../../../shared/model'
import { artworkKey } from '../../../shared/model'
import type { EdmLangValue, EdmValue, RijksEdmRecord } from './types'

const PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'
const HAS_SERVICE = 'http://rdfs.org/sioc/services#has_service'

function isLangValue(v: unknown): v is EdmLangValue {
  return typeof v === 'object' && v !== null && '@value' in v
}

/**
 * EDM value shapes vary per field: plain string, language-keyed map
 * (`{"nl": "...", "en"?: "..."}`), a single `{"@language","@value"}`, or an
 * array of those. Normalize them all. Preference order: en → nl → first
 * available (many works are nl-titled only, so the nl-fallback is load-bearing).
 */
export function langValue(value: EdmValue): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    const byLang = (lang: string) => value.find((v) => v['@language'] === lang)?.['@value']
    return byLang('en') ?? byLang('nl') ?? value[0]?.['@value']
  }

  if (isLangValue(value)) return value['@value']

  const map = value as Record<string, string>
  return map.en ?? map.nl ?? Object.values(map)[0]
}

/** "1895 - 1900" → [1895, 1900]; "1893" → [1893, 1893]; garbage → undefined. */
function parseYears(dateText: string | undefined): [number, number] | undefined {
  if (!dateText) return undefined
  const years = dateText.match(/\d{4}/g)
  if (!years) return undefined
  const start = Number(years[0])
  const end = Number(years[years.length - 1])
  return [start, end]
}

export function rijksToArtwork(raw: RijksEdmRecord, id: string): Artwork {
  const cho = raw.aggregatedCHO
  const artist = langValue(cho?.creator?.[0]?.[PREF_LABEL])
  const dateText = langValue(cho?.created)
  const years = parseYears(dateText)
  const objectNumber = cho?.identifier?.[0]

  const iiifBase = raw.isShownBy?.[HAS_SERVICE]?.id
  const image: Artwork['image'] = {}
  if (iiifBase) {
    image.iiifBase = iiifBase
    image.thumbnailUrl = `${iiifBase}/full/!400,400/0/default.jpg`
  }
  if (raw.isShownBy?.id) image.nativeUrl = raw.isShownBy.id

  const extra: Record<string, string> = {}
  const dcType = langValue(cho?.dcType)
  if (dcType) extra['Type'] = dcType
  if (objectNumber) extra['Object no.'] = objectNumber

  return {
    v: 1,
    provider: 'rijks',
    id,
    key: artworkKey('rijks', id),
    title: langValue(cho?.title) ?? 'Untitled',
    artist: artist ?? 'Unknown artist',
    dateText,
    yearStart: years?.[0],
    yearEnd: years?.[1],
    // edmRights is a rights URI; only the two public-domain forms are open.
    rights: /publicdomain\/(zero|mark)/.test(raw.edmRights ?? '') ? 'public-domain' : 'copyrighted',
    medium: langValue(cho?.medium),
    sourceUrl: raw.isShownAt?.id,
    image,
    extra,
  }
}
