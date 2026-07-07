import type { Artwork } from '../../shared/model'
import { FIGMA_MAX_IMAGE_PX } from '../images/sizing'
import { fetchImageViaPlugin } from '../images/pluginFetch'
import { getProvider } from '../providers/registry'

export type FetchedImage = {
  bytes: Uint8Array
  width: number
  height: number
}

async function decodeImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image decode failed'))
    img.src = objectUrl
  })
}

function canvasToBytes(canvas: HTMLCanvasElement, mimeType: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error('Image re-encode failed'))
        resolve(new Uint8Array(await blob.arrayBuffer()))
      },
      mimeType,
      0.92,
    )
  })
}

/**
 * Decodes `blob`, downscaling via canvas if it exceeds `maxPx` on either
 * side. figma.createImage throws above 4096px per side; IIIF providers are
 * clamped at the URL level, so this canvas downscale mainly covers
 * fixed-URL providers and honors smaller requested insert sizes. The canvas
 * decode/downscale stays in the UI — the plugin main thread has no canvas.
 */
async function decodeAndDownscale(blob: Blob, maxPx: number): Promise<FetchedImage> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await decodeImage(objectUrl)
    const width = img.naturalWidth
    const height = img.naturalHeight

    const limit = Math.min(maxPx, FIGMA_MAX_IMAGE_PX)
    if (width > limit || height > limit) {
      const scale = limit / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not downscale image')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const mimeType = blob.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const bytes = await canvasToBytes(canvas, mimeType)
      return { bytes, width: canvas.width, height: canvas.height }
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    return { bytes, width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Fetches `url` directly from the UI iframe — the default transport. */
async function fetchViaIframe(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`)
  return response.blob()
}

/**
 * Fetches image bytes for `url` and decodes/downscales them, choosing
 * transport by the work's provider: iframe providers fetch directly (as
 * before), main-thread providers (AIC) route through the plugin controller
 * since their image host blocks sandboxed iframe fetches. Bytes cross
 * postMessage twice for AIC inserts (plugin -> UI -> plugin) — a few
 * hundred KB, acceptable to keep a single code path.
 */
export async function loadImageWithDimensions(
  work: Artwork,
  url: string,
  maxPx: number = FIGMA_MAX_IMAGE_PX,
): Promise<FetchedImage> {
  const provider = getProvider(work.provider)
  const blob =
    provider.imageLoading === 'main-thread'
      ? // See imageCache.ts for why the BlobPart cast is needed here.
        new Blob([(await fetchImageViaPlugin(url)) as BlobPart])
      : await fetchViaIframe(url)
  return decodeAndDownscale(blob, maxPx)
}
