import type { Artwork } from './api/smkClient'

export type Filters = {
  creator?: string
  periodStart?: number
  periodEnd?: number
  publicDomainOnly: boolean
  hasImage: boolean
}

export const DEFAULT_FILTERS: Filters = {
  publicDomainOnly: true,
  hasImage: true,
}

export type Collection = {
  id: string
  name: string
  createdAt: string
  works: Artwork[]
}

export type Tab = 'search' | 'collections'

export type InsertSize = 'thumbnail' | 'medium' | 'large' | 'native'
