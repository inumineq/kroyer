/** Raw Art Institute of Chicago API schema (https://api.artic.edu/docs/). */

export type AicArtwork = {
  id: number
  title?: string | null
  artist_display?: string | null
  date_display?: string | null
  date_start?: number | null
  date_end?: number | null
  is_public_domain?: boolean
  image_id?: string | null
  medium_display?: string | null
  credit_line?: string | null
  department_title?: string | null
  artwork_type_title?: string | null
  /** Inline low-quality placeholder + accessibility text for the main image */
  thumbnail?: {
    lqip?: string | null
    alt_text?: string | null
    width?: number | null
    height?: number | null
  } | null
}

export type AicSearchResponse = {
  data?: AicArtwork[]
  pagination?: {
    total?: number
    limit?: number
    current_page?: number
    total_pages?: number
  }
}
