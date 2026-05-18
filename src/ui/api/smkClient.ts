const API_BASE = 'https://api.smk.dk/api/v1'

export type Title = {
  title: string
  type?: string
  language?: string
}

export type Production = {
  creator?: string
  creator_forename?: string
  creator_surname?: string
  creator_date_of_birth?: string
  creator_nationality?: string
  creator_gender?: string
}

export type ProductionDate = {
  start?: string
  end?: string
  period?: string
}

export type Artwork = {
  id: string
  object_number: string
  titles?: Title[]
  artist?: string[]
  production?: Production[]
  production_date?: ProductionDate[]
  techniques?: string[]
  object_names?: { name: string }[]
  has_image: boolean
  has_3d_file?: boolean
  public_domain: boolean
  on_display?: boolean
  image_thumbnail?: string
  image_native?: string
  image_orientation?: string
  image_width?: number
  image_height?: number
  iiif_manifest?: string
  frontend_url?: string
  enrichment_url?: string
  similar_images_url?: string
  credit_line?: string[]
  rights?: string
  notes?: string[]
  responsible_department?: string
}

export type SearchParams = {
  keys?: string
  creator?: string
  periodStart?: number
  periodEnd?: number
  publicDomainOnly?: boolean
  hasImage?: boolean
  rows?: number
  offset?: number
}

export type SearchResult = {
  found: number
  offset: number
  rows: number
  items: Artwork[]
  corrections?: Record<string, string[]>
}

function buildFilters(params: SearchParams): string {
  const filters: string[] = []
  if (params.creator) filters.push(`[creator:${params.creator}]`)
  if (params.publicDomainOnly) filters.push('[public_domain:true]')
  if (params.hasImage) filters.push('[has_image:true]')
  if (params.periodStart != null && params.periodEnd != null) {
    filters.push(`[production_dates_period:${params.periodStart}-${params.periodEnd}]`)
  }
  return filters.join(',')
}

export async function searchArtworks(params: SearchParams): Promise<SearchResult> {
  const query = new URLSearchParams({
    keys: params.keys?.trim() || '*',
    rows: String(params.rows ?? 30),
    offset: String(params.offset ?? 0),
  })

  const filterString = buildFilters(params)
  if (filterString) query.set('filters', filterString)

  const res = await fetch(`${API_BASE}/art/search/?${query}`)
  if (!res.ok) throw new Error(`SMK search failed: ${res.status} ${res.statusText}`)

  return res.json()
}

export async function getArtwork(objectNumber: string): Promise<Artwork> {
  const res = await fetch(`${API_BASE}/art?object_number=${encodeURIComponent(objectNumber)}`)
  if (!res.ok) throw new Error(`SMK lookup failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  if (!data.item) throw new Error(`Artwork not found: ${objectNumber}`)
  return data.item
}

export async function getSimilarArtworks(similarImagesUrl: string): Promise<Artwork[]> {
  const res = await fetch(similarImagesUrl)
  if (!res.ok) throw new Error(`SMK similar lookup failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  return data.items ?? []
}
