/**
 * Normalized domain model shared by the UI iframe and the plugin sandbox.
 *
 * Provider mappers (src/ui/providers/<id>/mapper.ts) convert each museum's raw
 * API schema into `Artwork` exactly once; everything downstream — components,
 * collections, messages — works only with this shape.
 */

export type ProviderId = 'smk' | 'aic' | 'cma' | 'met'

export type Rights = 'public-domain' | 'cc0' | 'cc-by' | 'copyrighted' | 'unknown'

export type ArtworkImage = {
  /** ~300-1000px image for grids and previews */
  thumbnailUrl?: string
  /** Largest directly addressable image */
  nativeUrl?: string
  /** IIIF Image API base (everything before `/full/...`) when the museum serves IIIF */
  iiifBase?: string
  /** Native pixel dimensions when the API reports them */
  width?: number
  height?: number
}

export type Artwork = {
  /** Schema version for snapshots persisted in collections */
  v: 1
  provider: ProviderId
  /** Provider-local id (SMK object_number, AIC id, Met objectID, …) */
  id: string
  /** `${provider}:${id}` — the global identity used for keys and dedup */
  key: string
  title: string
  artist: string
  /** Display date string ("1893", "c. 1660–65") */
  dateText?: string
  yearStart?: number
  yearEnd?: number
  rights: Rights
  creditLine?: string
  medium?: string
  description?: string
  /** Museum web page for this work */
  sourceUrl?: string
  image: ArtworkImage
  /** Provider-specific similar-works endpoint, when supported */
  similarUrl?: string
  /** Provider-specific display-only metadata (Type, Department, Object no., …) */
  extra?: Record<string, string>
}

export function artworkKey(provider: ProviderId, id: string): string {
  return `${provider}:${id}`
}

/** True when the work can be used without permission (the plugin's main filter). */
export function isFreelyUsable(rights: Rights): boolean {
  return rights === 'public-domain' || rights === 'cc0'
}

/**
 * Exhaustive display mapping for every rights value, so adding a Rights
 * member forces both the card badge and the detail label to be considered.
 */
export const RIGHTS_DISPLAY: Record<Rights, { label: string; badge?: string }> = {
  'public-domain': { label: 'Public Domain' },
  cc0: { label: 'Public Domain (CC0)' },
  'cc-by': { label: 'CC BY — attribution required', badge: 'CC BY' },
  copyrighted: { label: '© Under copyright', badge: '©' },
  unknown: { label: 'Rights unknown', badge: '©?' },
}

export function hasDisplayableImage(work: Artwork): boolean {
  return Boolean(work.image.thumbnailUrl ?? work.image.nativeUrl)
}

export type Collection = {
  id: string
  name: string
  createdAt: string
  works: Artwork[]
}
