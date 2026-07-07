/** Raw SMK API schema — see TECH-NOTES.md. Only the mapper should import this. */

export type SmkTitle = {
  title: string
  type?: string
  language?: string
}

export type SmkProductionDate = {
  start?: string
  end?: string
  period?: string
}

export type SmkArtwork = {
  id: string
  object_number: string
  titles?: SmkTitle[]
  artist?: string[]
  production_date?: SmkProductionDate[]
  techniques?: string[]
  object_names?: { name: string }[]
  has_image: boolean
  public_domain: boolean
  image_thumbnail?: string
  image_native?: string
  image_width?: number
  image_height?: number
  frontend_url?: string
  similar_images_url?: string
  credit_line?: string[]
  notes?: string[]
  responsible_department?: string
}

export type SmkSearchResponse = {
  found: number
  offset: number
  rows: number
  items?: SmkArtwork[]
  corrections?: Record<string, string[]>
}
