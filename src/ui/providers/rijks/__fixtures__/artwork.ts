import type { RijksEdmRecord } from '../types'

/**
 * Representative EDM-framed hydration record (shape verified live against
 * `https://data.rijksmuseum.nl/200105339?_profile=edm-framed&_media_type=application/ld+json`
 * on 2026-07-08 — see the plan's "Verified API facts").
 */
export const RIJKS_FIXTURE_FULL: RijksEdmRecord = {
  aggregatedCHO: {
    title: { nl: 'Schoolklas meisjes met breiwerk' },
    creator: [
      {
        'http://www.w3.org/2004/02/skos/core#prefLabel': [
          { '@language': 'nl', '@value': 'C. Lapine' },
        ],
      },
    ],
    identifier: ['RP-T-00-808'],
    created: [{ '@language': 'nl', '@value': '1895 - 1900' }],
    medium: [{ '@language': 'nl', '@value': 'papier' }],
    dcType: [{ '@language': 'nl', '@value': 'tekening' }],
  },
  isShownAt: { id: 'https://www.rijksmuseum.nl/nl/collectie/RP-T-00-808' },
  isShownBy: {
    id: 'https://iiif.micr.io/oZsQW/full/max/0/default.jpg',
    'http://rdfs.org/sioc/services#has_service': { id: 'https://iiif.micr.io/oZsQW' },
  },
  edmRights: 'http://creativecommons.org/publicdomain/mark/1.0/',
}

/**
 * Sparse item — missing `isShownBy` (no image), `creator`, `created`, and
 * en-titles. Exercises langValue's nl-fallback and the mapper's `image: {}`
 * exact-shape default.
 */
export const RIJKS_FIXTURE_SPARSE: RijksEdmRecord = {
  aggregatedCHO: {
    title: { nl: 'Ongetiteld werk' },
    identifier: ['RP-T-1900-1'],
  },
  isShownAt: { id: 'https://www.rijksmuseum.nl/nl/collectie/RP-T-1900-1' },
  edmRights: undefined,
}
