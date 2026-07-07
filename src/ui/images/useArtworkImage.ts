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
 * Resolves the image to render for `work` at `size`, choosing transport by
 * the work's provider. Iframe providers (SMK/Met/CMA) are zero-behavior-
 * change: this just returns imageUrlFor() directly, ready immediately.
 * Main-thread providers (AIC) fetch through the plugin controller and cache
 * the result as a blob: URL, exposing lqip immediately so the grid isn't
 * empty while that fetch is in flight.
 */
export function useArtworkImage(work: Artwork, size: ImageSize): ArtworkImageState {
  const provider = getProvider(work.provider)
  const url = imageUrlFor(work, size)
  const iframeProvider = provider.imageLoading !== 'main-thread'

  const [state, setState] = useState<ArtworkImageState>(() =>
    iframeProvider
      ? { src: url, status: url ? 'ready' : 'error' }
      : { lqip: work.image.lqip, status: url ? 'loading' : 'error' },
  )

  useEffect(() => {
    if (iframeProvider) {
      setState({ src: url, status: url ? 'ready' : 'error' })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, iframeProvider, work.image.lqip])

  return state
}
