/** Raw Cleveland Museum of Art Open Access API schema (https://openaccess-api.clevelandart.org/). */

export type CmaImage = {
  url?: string
  width?: string | number
  height?: string | number
}

export type CmaArtwork = {
  id: number
  accession_number?: string
  title?: string | null
  creators?: { description?: string | null }[]
  creation_date?: string | null
  creation_date_earliest?: number | null
  creation_date_latest?: number | null
  technique?: string | null
  department?: string | null
  type?: string | null
  images?: {
    web?: CmaImage
    print?: CmaImage
    full?: CmaImage
  } | null
  share_license_status?: string | null
  url?: string | null
  creditline?: string | null
}

export type CmaSearchResponse = {
  info?: { total?: number }
  data?: CmaArtwork[]
}
