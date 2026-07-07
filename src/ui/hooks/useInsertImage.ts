import { useCallback, useState } from 'react'
import type { Artwork } from '../../shared/model'
import { FIGMA_MAX_IMAGE_PX, imageUrlFor, SIZE_PIXELS } from '../images/sizing'
import { fetchImageWithDimensions } from '../utils/images'
import { postToPlugin, type Caption } from '../messages'
import type { InsertSize } from '../types'

function buildLayerName(work: Artwork): string {
  return `${work.artist} — ${work.title}`
}

function buildCaption(work: Artwork): Caption {
  return {
    title: work.title,
    artist: work.artist,
    year: work.dateText,
  }
}

type InsertOptions = {
  size: InsertSize
  withCaption: boolean
}

export function useInsertImage() {
  const [inserting, setInserting] = useState<string | null>(null)
  const [insertError, setInsertError] = useState<string | null>(null)

  const insertArtwork = useCallback(
    async (work: Artwork, options: InsertOptions) => {
      const url = imageUrlFor(work, options.size)
      if (!url) {
        setInsertError('No image available for this artwork')
        return
      }

      setInserting(work.key)
      setInsertError(null)
      try {
        // Downscale to the requested size when the URL couldn't honor it
        // (fixed-URL providers serving native images for 'large')
        const maxPx = options.size === 'native' ? FIGMA_MAX_IMAGE_PX : SIZE_PIXELS[options.size]
        const { bytes, width, height } = await fetchImageWithDimensions(url, maxPx)
        postToPlugin({
          type: 'insert-image',
          imageBytes: bytes,
          width,
          height,
          layerName: buildLayerName(work),
          caption: options.withCaption ? buildCaption(work) : undefined,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Insert failed'
        setInsertError(message)
      } finally {
        setInserting(null)
      }
    },
    [],
  )

  return { insertArtwork, inserting, insertError, clearError: () => setInsertError(null) }
}
