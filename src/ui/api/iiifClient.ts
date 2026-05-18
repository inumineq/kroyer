/**
 * SMK serves images via two URL patterns:
 *
 *   1. IIIF (iip-thumb.smk.dk):
 *      https://iip-thumb.smk.dk/iiif/jp2/{filename}.tif.jp2/full/!{size},/0/default.jpg
 *      → supports on-demand resizing via the `!{size},` segment
 *
 *   2. Plain thumbnail (api.smk.dk):
 *      https://api.smk.dk/api/v1/thumbnail/{uuid}.jpg
 *      → fixed size, no resize support
 *
 * Most works use pattern 1. Use `resizeImage` to request a specific size; it returns
 * the input unchanged when the URL doesn't match pattern 1.
 */

const IIIF_SIZE_PATTERN = /\/full\/!?\d*,?\d*\//

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'native'

export const SIZE_PIXELS: Record<Exclude<ImageSize, 'native'>, number> = {
  thumbnail: 300,
  medium: 800,
  large: 1600,
}

export function resizeImage(url: string, sizePx: number): string {
  if (!IIIF_SIZE_PATTERN.test(url)) return url
  return url.replace(IIIF_SIZE_PATTERN, `/full/!${sizePx},/`)
}

export function pickImageUrl(
  artwork: { image_thumbnail?: string; image_native?: string },
  size: ImageSize,
): string | undefined {
  if (size === 'native') return artwork.image_native ?? artwork.image_thumbnail
  if (!artwork.image_thumbnail) return artwork.image_native

  const pixels = SIZE_PIXELS[size]
  return resizeImage(artwork.image_thumbnail, pixels)
}
