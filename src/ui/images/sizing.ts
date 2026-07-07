import type { Artwork, ProviderId } from '../../shared/model'

export type ImageSize = 'thumbnail' | 'medium' | 'large' | 'native'

export const SIZE_PIXELS: Record<Exclude<ImageSize, 'native'>, number> = {
  thumbnail: 300,
  medium: 800,
  large: 1600,
}

/** figma.createImage rejects images larger than this on either side. */
export const FIGMA_MAX_IMAGE_PX = 4096

/**
 * IIIF size-segment dialects differ per server: SMK accepts width-only
 * best-fit (`!300,`), AIC is strict IIIF 2.0 (`300,`).
 */
const IIIF_SIZE_SEGMENT: Partial<Record<ProviderId, (px: number) => string>> = {
  smk: (px) => `!${px},`,
  aic: (px) => `${px},`,
}

/** Provider-side caps on requestable IIIF width (AIC serves up to 1686px). */
const PROVIDER_MAX_IIIF_PX: Partial<Record<ProviderId, number>> = {
  aic: 1686,
}

export function iiifImageUrl(iiifBase: string, widthPx: number, provider: ProviderId): string {
  const cap = PROVIDER_MAX_IIIF_PX[provider]
  const px = cap ? Math.min(widthPx, cap) : widthPx
  const segment = (IIIF_SIZE_SEGMENT[provider] ?? IIIF_SIZE_SEGMENT.smk!)(px)
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
  return thumbnailUrl ?? nativeUrl
}
