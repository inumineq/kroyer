export type { Collection } from '../shared/model'
export type { ImageSize as InsertSize } from './images/sizing'

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

export type Tab = 'search' | 'collections'
