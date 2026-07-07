import type { SmkArtwork } from '../types'

/** Representative SMK search item (shape per TECH-NOTES.md and the SMK API docs). */
export const SMK_FIXTURE_FULL: SmkArtwork = {
  id: '1170000000000',
  object_number: 'KMS3352',
  titles: [
    { title: 'Sommeraften ved Skagens strand', language: 'dan' },
    { title: 'Summer Evening on Skagen Beach', type: 'translated', language: 'eng' },
  ],
  artist: ['P.S. Krøyer'],
  production_date: [{ start: '1893-01-01', end: '1893-12-31', period: '1893' }],
  techniques: ['Oil on canvas'],
  object_names: [{ name: 'maleri' }],
  has_image: true,
  public_domain: true,
  image_thumbnail:
    'https://iip-thumb.smk.dk/iiif/jp2/KMS3352.tif.jp2/full/!1024,/0/default.jpg',
  image_native:
    'https://iip.smk.dk/iiif/jp2/KMS3352.tif.jp2/full/full/0/default.jpg',
  image_width: 6810,
  image_height: 4788,
  frontend_url: 'https://open.smk.dk/artwork/image/KMS3352',
  similar_images_url: 'https://similar.api.smk.dk/similar/?object_number=KMS3352',
  credit_line: ['Købt 1908'],
  notes: ['Skagensmalerne yndede strandmotiver.'],
  responsible_department: 'Maleri og Skulptur 1550-1900',
}

/** Sparse item — plain fixed-size thumbnail, missing most optional fields. */
export const SMK_FIXTURE_SPARSE: SmkArtwork = {
  id: '1170000000001',
  object_number: 'KKS1234',
  has_image: true,
  public_domain: false,
  image_thumbnail: 'https://api.smk.dk/api/v1/thumbnail/abc-123.jpg',
}
