export type FetchedImage = {
  bytes: Uint8Array
  width: number
  height: number
}

export async function fetchImageWithDimensions(url: string): Promise<FetchedImage> {
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
