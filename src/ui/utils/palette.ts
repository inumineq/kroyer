export type PaletteColor = {
  r: number
  g: number
  b: number
  count: number
}

/**
 * Extract dominant colors from an image URL using bucketed quantization.
 * Downsamples to 100x100, buckets each pixel by 4-bit-per-channel resolution,
 * averages within buckets, and picks the most populous buckets while skipping
 * colors that are too close to ones already picked.
 *
 * Returns RGB values in 0-255 range.
 */
export async function extractPalette(imageUrl: string, count = 5): Promise<PaletteColor[]> {
  const img = await loadImage(imageUrl)

  const SIZE = 100
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not supported')
  ctx.drawImage(img, 0, 0, SIZE, SIZE)

  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

  const buckets = new Map<number, PaletteColor>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 250) continue

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const existing = buckets.get(key)
    if (existing) {
      existing.r = (existing.r * existing.count + r) / (existing.count + 1)
      existing.g = (existing.g * existing.count + g) / (existing.count + 1)
      existing.b = (existing.b * existing.count + b) / (existing.count + 1)
      existing.count++
    } else {
      buckets.set(key, { r, g, b, count: 1 })
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count)
  const picked: PaletteColor[] = []
  const MIN_DISTANCE = 50

  for (const color of sorted) {
    if (picked.length >= count) break
    if (picked.some((p) => colorDistance(p, color) < MIN_DISTANCE)) continue
    picked.push(color)
  }

  for (const color of sorted) {
    if (picked.length >= count) break
    if (!picked.includes(color)) picked.push(color)
  }

  return picked
}

function colorDistance(a: PaletteColor, b: PaletteColor): number {
  return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2))
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
