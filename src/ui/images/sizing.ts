import type { Artwork, ProviderId } from '../../shared/model'

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'native'

export const SIZE_PIXELS: Record<Exclude<ImageSize, 'native'>, number> = {
  thumbnail: 300,
  medium: 800,
  large: 1600,
}

/** figma.createImage rejects images larger than this on either side. */
export const FIGMA_MAX_IMAGE_PX = 4096

/** AIC's documented IIIF widths; requests should stick to these. */
const AIC_SIZES = [200, 400, 600, 843, 1686]

/**
 * Per-provider IIIF dialect: SMK accepts width-only best-fit (`!300,`) at any
 * width; AIC is strict IIIF 2.0 (`300,`) and documents specific sizes, so
 * requests snap to the nearest documented width.
 */
const IIIF_SIZE_SEGMENT: Partial<Record<ProviderId, (px: number) => string>> = {
  smk: (px) => `!${px},`,
  aic: (px) => `${AIC_SIZES.find((s) => s >= px) ?? AIC_SIZES[AIC_SIZES.length - 1]},`,
}

export function iiifImageUrl(iiifBase: string, widthPx: number, provider: ProviderId): string {
  const segment = (IIIF_SIZE_SEGMENT[provider] ?? IIIF_SIZE_SEGMENT.smk!)(widthPx)
  return `${iiifBase}/full/${segment}/0/default.jpg`
}

/**
 * Best URL for the requested size. IIIF-capable providers get an exact-size
 * request; others fall back to the closest fixed URL.
 */
export function imageUrlFor(work: Artwork, size: ImageSize): string | undefined {
  const { thumbnailUrl, nativeUrl, iiifBase, width, height } = work.image

  if (size === 'native') {
    // When the native image is known to exceed Figma's limit and the provider
    // supports IIIF, request the largest insertable size instead.
    const exceedsLimit =
      (width ?? 0) > FIGMA_MAX_IMAGE_PX || (height ?? 0) > FIGMA_MAX_IMAGE_PX
    if (exceedsLimit && iiifBase) return iiifImageUrl(iiifBase, FIGMA_MAX_IMAGE_PX, work.provider)
    return nativeUrl ?? thumbnailUrl
  }

  const px = Math.min(SIZE_PIXELS[size], FIGMA_MAX_IMAGE_PX)
  if (iiifBase) return iiifImageUrl(iiifBase, px, work.provider)
  // Fixed-URL providers can't resize: for 'large' prefer the native image
  // (the fetch path downscales to the requested size); smaller presets keep
  // the fast web-sized thumbnail.
  if (size === 'large') return nativeUrl ?? thumbnailUrl
  return thumbnailUrl ?? nativeUrl
}
