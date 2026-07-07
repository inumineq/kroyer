/**
 * Raw Rijksmuseum Data Services API schema (data.rijksmuseum.nl). See
 * TECH-NOTES.md. Only the mapper should import this.
 */

/** A single `{"@language","@value"}` pair, as seen inside EDM value arrays. */
export type EdmLangValue = {
  '@language'?: string
  '@value'?: string
}

/**
 * EDM string-ish values vary by field: a plain string, a language-keyed
 * object (`{"nl": "...", "en"?: "..."}`), a single `{"@language","@value"}`
 * object, or an array of those. `langValue` in mapper.ts normalizes all four.
 */
export type EdmValue = string | EdmLangValue | EdmLangValue[] | Record<string, string> | undefined

export type RijksCreator = {
  'http://www.w3.org/2004/02/skos/core#prefLabel'?: EdmLangValue[]
}

export type RijksAggregatedCHO = {
  title?: EdmValue
  creator?: RijksCreator[]
  identifier?: string[]
  created?: EdmValue
  medium?: EdmValue
  dcType?: EdmValue
}

export type RijksIsShownBy = {
  id?: string
  'http://rdfs.org/sioc/services#has_service'?: { id?: string }
}

/** Response shape for `?_profile=edm-framed&_media_type=application/ld+json`. */
export type RijksEdmRecord = {
  aggregatedCHO?: RijksAggregatedCHO
  isShownAt?: { id?: string }
  isShownBy?: RijksIsShownBy
  edmRights?: string
}

/** A single entry in the Linked Art search response's `orderedItems`. */
export type RijksOrderedItem = {
  id: string
  type?: string
}

/** Response shape for `GET /search/collection`. */
export type RijksSearchResponse = {
  partOf?: { totalItems?: number }
  orderedItems?: RijksOrderedItem[]
  next?: { id?: string }
}
