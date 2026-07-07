import { FIGMA_MAX_IMAGE_PX } from '../images/sizing'

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

export async function fetchImageWithDimensions(
  url: string,
  maxPx: number = FIGMA_MAX_IMAGE_PX,
): Promise<FetchedImage> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`)

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    const img = await decodeImage(objectUrl)
    const width = img.naturalWidth
    const height = img.naturalHeight

    // figma.createImage throws above 4096px per side. IIIF providers are
    // clamped at the URL level; this canvas downscale covers fixed-URL
    // providers and honors smaller requested insert sizes.
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
