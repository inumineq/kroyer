import { useEffect, useState } from 'react'
import type { Artwork } from '../../shared/model'
import { getProvider } from '../providers/registry'
import { imageUrlFor, type ImageSize } from './sizing'
import { getCachedImageUrl } from './imageCache'

export type ArtworkImageState = {
  /** Renderable <img src> — a direct URL for iframe providers, a cached
   * blob: URL for main-thread providers once the fetch resolves. */
  src?: string
  /** Inline low-quality placeholder to show immediately while loading. */
  lqip?: string
  status: 'loading' | 'ready' | 'error'
}

/**
 * URL an iframe provider (SMK/Met/CMA) should render at `size`. Zero-
 * behavior-change vs. pre-hook code: for 'thumbnail' this prefers the
 * provider API's own thumbnailUrl (e.g. SMK's `image_thumbnail`) over the
 * IIIF URL imageUrlFor() would rebuild, since that's what every surface
 * (grid/related/collections) rendered directly before this hook existed.
 * Other sizes had no such pre-existing fixed URL, so they use imageUrlFor().
 */
export function iframeImageUrlFor(work: Artwork, size: ImageSize): string | undefined {
  if (size === 'thumbnail') return work.image.thumbnailUrl ?? imageUrlFor(work, size)
  return imageUrlFor(work, size)
}

/**
 * Resolves the image to render for `work` at `size`, choosing transport by
 * the work's provider. Iframe providers (SMK/Met/CMA) are zero-behavior-
 * change: this just returns iframeImageUrlFor() directly, ready immediately.
 * Main-thread providers fetch through the plugin controller and cache the
 * result as a blob: URL, exposing lqip immediately so the grid isn't empty
 * while that fetch is in flight. Blocked providers (AIC — see
 * providers/types.ts) never fire a request that's guaranteed to 403: they
 * resolve straight to lqip + status 'error', the same terminal state a
 * failed main-thread fetch would reach, so ResultCard/DetailPanel's existing
 * `status === 'error' && hasDisplayableImage(work)` "blocked" gate covers
 * both without change.
 */
export function useArtworkImage(work: Artwork, size: ImageSize): ArtworkImageState {
  const provider = getProvider(work.provider)
  const iframeProvider = provider.imageLoading === 'iframe'
  const blockedProvider = provider.imageLoading === 'blocked'
  const url = iframeProvider ? iframeImageUrlFor(work, size) : imageUrlFor(work, size)

  const [state, setState] = useState<ArtworkImageState>(() => {
    if (iframeProvider) return { src: url, status: url ? 'ready' : 'error' }
    if (blockedProvider) return { lqip: work.image.lqip, status: 'error' }
    return { lqip: work.image.lqip, status: url ? 'loading' : 'error' }
  })

  useEffect(() => {
    if (iframeProvider) {
      setState({ src: url, status: url ? 'ready' : 'error' })
      return
    }

    // No viable byte route — don't fire a fetch that's guaranteed to 403.
    if (blockedProvider) {
      setState({ lqip: work.image.lqip, status: 'error' })
      return
    }

    if (!url) {
      setState({ lqip: work.image.lqip, status: 'error' })
      return
    }

    setState({ lqip: work.image.lqip, status: 'loading' })
    const controller = new AbortController()

    getCachedImageUrl(url, controller.signal)
      .then((objectUrl) => {
        if (controller.signal.aborted) return
        setState({ src: objectUrl, lqip: work.image.lqip, status: 'ready' })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setState({ lqip: work.image.lqip, status: 'error' })
      })

    return () => controller.abort()
  }, [url, iframeProvider, blockedProvider, work.image.lqip])

  return state
}
