import { useCallback, useState } from 'react'
import type { Artwork } from '../api/smkClient'
import { pickImageUrl } from '../api/iiifClient'
import { postToPlugin, type Caption } from '../messages'
import type { InsertSize } from '../types'

type FetchedImage = {
  bytes: Uint8Array
  width: number
  height: number
}

async function fetchImageBytes(url: string): Promise<FetchedImage> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`)

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Image decode failed'))
      img.src = objectUrl
    })

    const bytes = new Uint8Array(await blob.arrayBuffer())
    return { bytes, width: dimensions.width, height: dimensions.height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function buildLayerName(work: Artwork): string {
  const title = work.titles?.[0]?.title ?? 'Untitled'
  const artist = work.artist?.[0] ?? 'Unknown'
  return `${artist} — ${title}`
}

function buildCaption(work: Artwork): Caption {
  return {
    title: work.titles?.[0]?.title ?? 'Untitled',
    artist: work.artist?.[0] ?? 'Unknown',
    year: work.production_date?.[0]?.period,
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
      const url = pickImageUrl(work, options.size)
      if (!url) {
        setInsertError('No image available for this artwork')
        return
      }

      setInserting(work.object_number)
      setInsertError(null)
      try {
        const { bytes, width, height } = await fetchImageBytes(url)
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
