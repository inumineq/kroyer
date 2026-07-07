/** Raw Metropolitan Museum of Art API schema (https://metmuseum.github.io/). */

export type MetSearchResponse = {
  total?: number
  objectIDs?: number[] | null
}

export type MetObject = {
  objectID: number
  accessionNumber?: string
  isPublicDomain?: boolean
  primaryImage?: string
  primaryImageSmall?: string
  title?: string
  artistDisplayName?: string
  objectDate?: string
  objectBeginDate?: number
  objectEndDate?: number
  medium?: string
  creditLine?: string
  department?: string
  objectName?: string
  objectURL?: string
}
